"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  Bot,
  ChartNoAxesCombined,
  Clock,
  Coins,
  Cpu,
  Gem,
  Hexagon,
  MousePointerClick,
  Radio,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sprout,
  Trophy,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ACHIEVEMENTS,
  UPGRADES,
  getNextPrestigeTarget,
  getPrestigeMultiplier,
  getUpgradeCost
} from "./game-data";
import { formatDateTime, formatNumber, formatRate } from "./format";
import { useGameStore, type GameLogType } from "./game-store";

type FloatingGain = {
  id: number;
  amount: number;
  x: number;
};

type StatItem = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "clay" | "moss" | "ochre" | "sage";
};

type DroneVisualNode = {
  id: string;
  left: string;
  top: string;
  delay: number;
};

const upgradeIcons: Record<string, LucideIcon> = {
  "tap-array": MousePointerClick,
  "micro-drone": Bot,
  "harvester-drone": Radio
};

const navItems = [
  { label: "Dashboard", targetId: "dashboard" },
  { label: "Upgrades", targetId: "upgrades" },
  { label: "Swarm", targetId: "swarm" },
  { label: "Prestige", targetId: "prestige" }
];

const statToneClasses: Record<StatItem["tone"], string> = {
  clay: "border-[#9f725c]/40 bg-[#5a3f32]/35 text-[#e9b08b]",
  moss: "border-[#879071]/40 bg-[#3f4b37]/35 text-[#c3c99b]",
  ochre: "border-[#c69a5d]/40 bg-[#665132]/35 text-[#e0bc78]",
  sage: "border-[#849283]/40 bg-[#465047]/35 text-[#c3ccb8]"
};

const themeClasses = {
  amber:
    "border-[#c69a5d]/55 bg-[#6a5230]/45 text-[#e8be72] shadow-[0_0_24px_rgba(198,154,93,0.16)]",
  cyan:
    "border-[#849283]/55 bg-[#3f4d44]/50 text-[#c7d0bc] shadow-[0_0_24px_rgba(132,146,131,0.16)]",
  green:
    "border-[#6f7d5b]/55 bg-[#3f4b37]/50 text-[#c8d49f] shadow-[0_0_24px_rgba(111,125,91,0.18)]",
  rose:
    "border-[#bd7f5a]/55 bg-[#5f3c31]/45 text-[#e1a07b] shadow-[0_0_24px_rgba(189,127,90,0.18)]",
  violet:
    "border-[#9a8072]/55 bg-[#584840]/45 text-[#d8bbad] shadow-[0_0_24px_rgba(154,128,114,0.18)]"
};

const logToneClasses: Record<GameLogType, string> = {
  achievement: "border-[#6f7d5b]/50 bg-[#3f4b37]/45 text-[#c8d49f]",
  click: "border-[#c69a5d]/50 bg-[#665132]/45 text-[#e0bc78]",
  event: "border-[#849283]/50 bg-[#465047]/45 text-[#c3ccb8]",
  prestige: "border-[#9a8072]/50 bg-[#584840]/45 text-[#d8bbad]",
  save: "border-[#b9ad99]/45 bg-[#3b3930]/50 text-[#e8ddcc]",
  upgrade: "border-[#bd7f5a]/50 bg-[#5f3c31]/45 text-[#e1a07b]"
};

export function ClickerGame() {
  const [hydrated, setHydrated] = useState(false);
  const [activeNavTarget, setActiveNavTarget] = useState("dashboard");
  const [floatingGains, setFloatingGains] = useState<FloatingGain[]>([]);
  const currency = useGameStore((state) => state.currency);
  const lifetimeCurrency = useGameStore((state) => state.lifetimeCurrency);
  const runCurrency = useGameStore((state) => state.runCurrency);
  const totalClicks = useGameStore((state) => state.totalClicks);
  const upgrades = useGameStore((state) => state.upgrades);
  const achievements = useGameStore((state) => state.achievements);
  const prestigeLevel = useGameStore((state) => state.prestigeLevel);
  const prestigePoints = useGameStore((state) => state.prestigePoints);
  const activeChain = useGameStore((state) => state.activeChain);
  const lastSavedAt = useGameStore((state) => state.lastSavedAt);
  const log = useGameStore((state) => state.log);
  const click = useGameStore((state) => state.click);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const tick = useGameStore((state) => state.tick);
  const prestige = useGameStore((state) => state.prestige);
  const saveNow = useGameStore((state) => state.saveNow);
  const resetSave = useGameStore((state) => state.resetSave);
  const clickPower = useGameStore((state) => state.getClickPower());
  const autoIncome = useGameStore((state) => state.getAutoIncome());
  const passiveIncome = useGameStore((state) => state.getPassiveIncome());
  const activeSurge = useGameStore((state) => state.getActiveSurge());
  const prestigeGain = useGameStore((state) => state.getPrestigeGain());

  useEffect(() => {
    let mounted = true;

    Promise.resolve(useGameStore.persist.rehydrate()).finally(() => {
      if (!mounted) {
        return;
      }

      const now = Date.now();

      useGameStore.setState((state) => ({
        lastSavedAt: state.lastSavedAt || now,
        lastTickAt: state.lastTickAt || now,
        log: state.log.map((entry) =>
          entry.createdAt
            ? entry
            : {
                ...entry,
                id: `${now}-initial-save`,
                createdAt: now
              }
        )
      }));
      setHydrated(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    tick();
    const timer = window.setInterval(() => tick(), 1000);

    return () => window.clearInterval(timer);
  }, [hydrated, tick]);

  const nextPrestigeTarget = getNextPrestigeTarget(runCurrency);
  const prestigeProgress = Math.min((runCurrency / nextPrestigeTarget) * 100, 100);
  const unlockedAchievementCount = Object.keys(achievements).length;
  const totalUpgradeCount = Object.values(upgrades).reduce(
    (total, count) => total + count,
    0
  );
  const microDroneCount = Math.max(0, Math.floor(upgrades["micro-drone"] ?? 0));
  const harvesterDroneCount = Math.max(
    0,
    Math.floor(upgrades["harvester-drone"] ?? 0)
  );
  const microDroneVisualNodes = useMemo(
    () => getDroneVisualNodes(microDroneCount, "micro-drone", -90, 0),
    [microDroneCount]
  );
  const harvesterDroneVisualNodes = useMemo(
    () => getDroneVisualNodes(harvesterDroneCount, "harvester-drone", -72, 8),
    [harvesterDroneCount]
  );
  const coreStability = Math.min(
    99,
    72 + Math.round(prestigeProgress * 0.18) + Math.min(prestigeLevel * 2, 9)
  );
  const stats: StatItem[] = [
    {
      label: "Credits",
      value: formatNumber(currency),
      detail: `Lifetime ${formatNumber(lifetimeCurrency)}`,
      icon: Coins,
      tone: "ochre"
    },
    {
      label: "Click Power",
      value: formatNumber(clickPower),
      detail: `${formatNumber(clickPower)} / click`,
      icon: MousePointerClick,
      tone: "clay"
    },
    {
      label: "Active Income",
      value: formatRate(autoIncome),
      detail:
        activeChain > 0
          ? `${totalUpgradeCount} total upgrades`
          : "Tap to activate drones",
      icon: Clock,
      tone: "moss"
    },
    {
      label: "Passive Gain",
      value: formatRate(passiveIncome),
      detail: `${harvesterDroneCount} harvesters`,
      icon: Radio,
      tone: "sage"
    },
    {
      label: "Active Surge",
      value: `x${activeSurge.toFixed(2)}`,
      detail: `${activeChain} chain`,
      icon: Activity,
      tone: "moss"
    }
  ];

  const upgradeRows = useMemo(() => {
    return UPGRADES.map((upgrade) => {
      const count = upgrades[upgrade.id] ?? 0;

      return {
        ...upgrade,
        count,
        cost: getUpgradeCost(upgrade, count),
        Icon: upgradeIcons[upgrade.id] ?? Zap
      };
    });
  }, [upgrades]);

  const nextLockedAchievement = ACHIEVEMENTS.find(
    (achievement) => !achievements[achievement.id]
  );

  function handleClick() {
    const id = Date.now();
    const x = Math.round(Math.random() * 72) - 36;

    const amount = click();
    setFloatingGains((items) => [
      ...items.slice(-5),
      {
        id,
        amount,
        x
      }
    ]);
  }

  function handleResetSave() {
    if (window.confirm("Reset this save and start over?")) {
      resetSave();
    }
  }

  function handleNavClick(targetId: string) {
    setActiveNavTarget(targetId);
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <main
      id="dashboard"
      className="min-h-screen scroll-mt-4 px-3 py-4 text-[#f5ecdd] sm:px-5 lg:px-7"
    >
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-4">
        <header className="rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 px-4 py-3 shadow-panel backdrop-blur md:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#c69a5d]/45 bg-[#3c3328] text-[#e0bc78] shadow-[0_0_28px_rgba(198,154,93,0.2)]">
                <Hexagon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-[#fff8eb] sm:text-3xl">
                    ClickerSwarm
                  </h1>
                  <span className="rounded-md border border-[#6f7d5b]/45 bg-[#364032] px-2 py-1 text-xs font-bold text-[#c8d49f]">
                    v0.1
                  </span>
                </div>
                <p className="text-sm font-medium text-[#b9ad99]">
                  Swarm Core Command
                </p>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-1 rounded-lg border border-[#766a58]/35 bg-[#1e2019]/80 p-1 text-sm font-bold text-[#b9ad99] md:flex md:min-w-0 md:overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.targetId}
                  type="button"
                  onClick={() => handleNavClick(item.targetId)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-center ${
                    item.targetId === activeNavTarget
                      ? "bg-[#d7c29a] text-[#26231b]"
                      : "text-[#b9ad99] transition hover:bg-[#343329] hover:text-[#fff8eb]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-[160px] items-center gap-2 rounded-lg border border-[#c69a5d]/45 bg-[#3b3023] px-3 py-2">
                <Gem className="h-4 w-4 text-[#e0bc78]" />
                <div>
                  <p className="text-xs font-bold uppercase text-[#a99b87]">
                    Vault
                  </p>
                  <p className="text-sm font-black text-[#fff8eb]">
                    {formatNumber(currency)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                title="Save now"
                onClick={saveNow}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#6f7d5b]/45 bg-[#3f4b37] px-3 text-sm font-bold text-[#eef3dd] transition hover:bg-[#4a5941]"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                title="Reset save"
                onClick={handleResetSave}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[#bd7f5a]/45 bg-[#4a3129] px-3 text-[#e9b08b] transition hover:bg-[#5a3b30]"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((stat) => (
            <Stat key={stat.label} stat={stat} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[310px_minmax(480px,1fr)_340px]">
          <aside className="flex flex-col gap-4">
            <section
              id="upgrades"
              className="scroll-mt-4 rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur"
            >
              <SectionTitle
                eyebrow="Core Upgrades"
                title="Upgrade Bay"
                icon={Cpu}
              />
              <div className="mt-4 flex flex-col gap-3">
                {upgradeRows.map((upgrade) => {
                  const canAfford = currency >= upgrade.cost;
                  const missingCurrency = Math.max(upgrade.cost - currency, 0);
                  const buyLabel = canAfford
                    ? `Buy ${upgrade.name} for ${formatNumber(upgrade.cost)} currency`
                    : `Need ${formatNumber(missingCurrency)} more currency to buy ${upgrade.name}`;
                  const Icon = upgrade.Icon;

                  return (
                    <article
                      key={upgrade.id}
                      className="rounded-lg border border-[#766a58]/45 bg-[#1f211b]/75 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${themeClasses[upgrade.theme]}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-[#fff8eb]">
                                {upgrade.name}
                              </h3>
                              <p className="text-xs font-semibold text-[#c8d49f]">
                                Lv. {upgrade.count}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-md border border-[#c69a5d]/35 bg-[#3b3023] px-2 py-1 text-xs font-black text-[#e0bc78]">
                              {formatNumber(upgrade.cost)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-5 text-[#b9ad99]">
                            {upgrade.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#a99b87]">
                            <span>{getUpgradeEffectText(upgrade.id)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        title={buyLabel}
                        aria-label={buyLabel}
                        onClick={() => buyUpgrade(upgrade.id)}
                        disabled={!canAfford}
                        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#c69a5d]/40 bg-[#b98255] px-4 text-sm font-black text-[#201912] transition hover:bg-[#d09a68] disabled:cursor-not-allowed disabled:border-[#766a58]/35 disabled:bg-[#343329] disabled:text-[#857b68]"
                      >
                        <Coins className="h-4 w-4" />
                        {canAfford
                          ? `Buy ${formatNumber(upgrade.cost)}`
                          : `Need ${formatNumber(missingCurrency)}`}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur">
              <SectionTitle
                eyebrow="Deployment"
                title="Swarm Units"
                icon={Radio}
              />
              <div className="mt-4 grid gap-3">
                <TelemetryRow
                  label="Tap Array"
                  value={`${upgrades["tap-array"] ?? 0} nodes`}
                  percent={Math.min((upgrades["tap-array"] ?? 0) * 12, 100)}
                  icon={MousePointerClick}
                />
                <TelemetryRow
                  label="Micro Drones"
                  value={`${upgrades["micro-drone"] ?? 0} active`}
                  percent={Math.min((upgrades["micro-drone"] ?? 0) * 12, 100)}
                  icon={Bot}
                />
                <TelemetryRow
                  label="Harvester Drones"
                  value={`${upgrades["harvester-drone"] ?? 0} passive`}
                  percent={Math.min(
                    (upgrades["harvester-drone"] ?? 0) * 12,
                    100
                  )}
                  icon={Radio}
                />
              </div>
            </section>
          </aside>

          <div className="flex flex-col gap-4">
            <section
              id="swarm"
              className="relative min-h-[520px] scroll-mt-4 overflow-hidden rounded-lg border border-[#766a58]/45 bg-[#202117] shadow-panel"
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(231,215,186,0.06)_1px,transparent_1px),linear-gradient(rgba(231,215,186,0.05)_1px,transparent_1px)] bg-[size:34px_34px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(198,154,93,0.26),rgba(111,125,91,0.14)_32%,transparent_58%)]" />
              <div className="relative z-10 flex h-full min-h-[520px] flex-col justify-between p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <HudBadge
                    label="Core Stability"
                    value={`${coreStability}%`}
                    percent={coreStability}
                    icon={ShieldCheck}
                  />
                  <HudBadge
                    label="Swarm Readiness"
                    value={`x${activeSurge.toFixed(2)}`}
                    percent={Math.min(activeChain, 100)}
                    icon={Activity}
                  />
                </div>

                <div className="relative flex min-h-[330px] items-center justify-center py-8">
                  <div className="absolute h-[330px] w-[330px] rounded-full border border-[#c69a5d]/25 sm:h-[390px] sm:w-[390px]" />
                  <div className="absolute h-[260px] w-[260px] rounded-full border border-dashed border-[#849283]/40 sm:h-[320px] sm:w-[320px]" />
                  <div className="absolute h-[190px] w-[190px] rounded-full border border-[#bd7f5a]/30 sm:h-[240px] sm:w-[240px]" />

                  {microDroneVisualNodes.map((node) => (
                    <motion.div
                      key={node.id}
                      className="absolute flex h-8 w-8 items-center justify-center rounded-lg border border-[#766a58]/55 bg-[#2f3128] text-[#d7c29a] shadow-[0_0_20px_rgba(198,154,93,0.16)] sm:h-10 sm:w-10"
                      style={{ left: node.left, top: node.top }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 2.6,
                        repeat: Infinity,
                        delay: node.delay
                      }}
                    >
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                    </motion.div>
                  ))}
                  {harvesterDroneVisualNodes.map((node) => (
                    <motion.div
                      key={node.id}
                      className="absolute flex h-8 w-8 items-center justify-center rounded-lg border border-[#6f7d5b]/60 bg-[#263024] text-[#c8d49f] shadow-[0_0_20px_rgba(111,125,91,0.2)] sm:h-10 sm:w-10"
                      style={{ left: node.left, top: node.top }}
                      animate={{ y: [0, 7, 0] }}
                      transition={{
                        duration: 3.1,
                        repeat: Infinity,
                        delay: node.delay
                      }}
                    >
                      <Radio className="h-4 w-4 sm:h-5 sm:w-5" />
                    </motion.div>
                  ))}

                  <AnimatePresence>
                    {floatingGains.map((gain) => (
                      <motion.div
                        key={gain.id}
                        className="pointer-events-none absolute left-1/2 top-8 rounded-lg border border-[#c69a5d]/45 bg-[#fff8eb] px-3 py-1 text-sm font-black text-[#8c5f36] shadow-lg"
                        initial={{ opacity: 0, y: 20, x: gain.x }}
                        animate={{ opacity: 1, y: -42, x: gain.x }}
                        exit={{ opacity: 0, y: -78 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        onAnimationComplete={() => {
                          setFloatingGains((items) =>
                            items.filter((item) => item.id !== gain.id)
                          );
                        }}
                      >
                        +{formatNumber(gain.amount)}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    title="Tap core"
                    onClick={handleClick}
                    whileTap={{ scale: 0.94 }}
                    className="relative flex h-56 w-56 items-center justify-center rounded-full border border-[#e0bc78]/70 bg-[#342b20] shadow-[0_0_0_12px_rgba(198,154,93,0.08),0_28px_80px_rgba(0,0,0,0.45),0_0_70px_rgba(198,154,93,0.24)] transition hover:border-[#f0d69b] focus:outline-none focus:ring-4 focus:ring-[#c69a5d]/35 sm:h-64 sm:w-64"
                  >
                    <span className="absolute inset-5 rounded-full border border-[#6f7d5b]/40" />
                    <span className="absolute inset-10 rounded-full border border-dashed border-[#d7c29a]/35" />
                    <img
                      src="/swarm-core.svg"
                      alt="Swarm core"
                      className="relative h-40 w-40 drop-shadow-[0_18px_32px_rgba(0,0,0,0.36)] sm:h-48 sm:w-48"
                      draggable={false}
                    />
                    <span className="absolute bottom-11 rounded-md border border-[#c69a5d]/40 bg-[#201912]/85 px-3 py-1 text-xs font-black uppercase text-[#f1d89d]">
                      Tap Core
                    </span>
                  </motion.button>
                </div>

                <div className="grid gap-3 rounded-lg border border-[#766a58]/45 bg-[#1d1f18]/85 p-3 sm:grid-cols-3">
                  <CockpitMetric
                    label="Run Credits"
                    value={formatNumber(runCurrency)}
                  />
                  <CockpitMetric
                    label="Total Clicks"
                    value={formatNumber(totalClicks)}
                  />
                  <CockpitMetric
                    label="Prestige Gain"
                    value={`+${formatNumber(prestigeGain)}`}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <section className="rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur">
                <SectionTitle
                  eyebrow="Production"
                  title="Output Flow"
                  icon={ChartNoAxesCombined}
                />
                <ProductionChart
                  clickPower={clickPower}
                  autoIncome={autoIncome}
                  passiveIncome={passiveIncome}
                  activeChain={activeChain}
                />
              </section>

              <section className="rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur">
                <SectionTitle
                  eyebrow="Activity"
                  title="Event Log"
                  icon={Activity}
                />
                <div className="mt-4 flex max-h-64 flex-col gap-2 overflow-auto pr-1">
                  {log.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-[#766a58]/40 bg-[#1f211b]/75 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-[#fff8eb]">
                          {entry.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${logToneClasses[entry.type]}`}
                        >
                          {entry.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#b9ad99]">
                        {entry.detail}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-[#857b68]">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section
              id="prestige"
              className="scroll-mt-4 rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur"
            >
              <SectionTitle eyebrow="Boost" title="Prestige" icon={Trophy} />
              <div className="mt-4 rounded-lg border border-[#766a58]/40 bg-[#1f211b]/75 p-3">
                <div className="flex justify-between gap-3 text-sm font-bold text-[#e8ddcc]">
                  <span>Run {formatNumber(runCurrency)}</span>
                  <span>Next {formatNumber(nextPrestigeTarget)}</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#343329]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6f7d5b] via-[#c69a5d] to-[#bd7f5a] transition-all"
                    style={{ width: `${prestigeProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-[#b9ad99]">
                  Multiplier x{getPrestigeMultiplier(prestigePoints).toFixed(2)}
                </p>
              </div>

              <button
                type="button"
                title="Prestige"
                onClick={prestige}
                disabled={prestigeGain <= 0}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#6f7d5b]/45 bg-[#526342] px-4 text-sm font-black text-[#f3f8e5] transition hover:bg-[#60744d] disabled:cursor-not-allowed disabled:border-[#766a58]/35 disabled:bg-[#343329] disabled:text-[#857b68]"
              >
                <RefreshCw className="h-4 w-4" />
                Prestige +{formatNumber(prestigeGain)}
              </button>
            </section>

            <section className="rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur">
              <SectionTitle
                eyebrow={`${unlockedAchievementCount} / ${ACHIEVEMENTS.length}`}
                title="Achievements"
                icon={BadgeCheck}
              />
              <div className="mt-4 grid gap-2">
                {ACHIEVEMENTS.map((achievement) => {
                  const unlocked = Boolean(achievements[achievement.id]);

                  return (
                    <div
                      key={achievement.id}
                      className={`rounded-lg border p-3 ${
                        unlocked
                          ? "border-[#6f7d5b]/45 bg-[#3f4b37]/45"
                          : "border-[#766a58]/40 bg-[#1f211b]/75"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#fff8eb]">
                          {achievement.name}
                        </p>
                        <span
                          className={`text-xs font-black ${
                            unlocked ? "text-[#c8d49f]" : "text-[#857b68]"
                          }`}
                        >
                          {unlocked ? "Unlocked" : "Locked"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#b9ad99]">
                        {achievement.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur">
              <SectionTitle eyebrow="Mission" title="Next Unlock" icon={Sprout} />
              <div className="mt-4 rounded-lg border border-[#766a58]/40 bg-[#1f211b]/75 p-3">
                <p className="text-sm font-bold text-[#fff8eb]">
                  {nextLockedAchievement?.name ?? "All Clear"}
                </p>
                <p className="mt-1 text-sm leading-5 text-[#b9ad99]">
                  {nextLockedAchievement?.description ??
                    "Every achievement is unlocked."}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <CockpitMetric
                  label="Saved"
                  value={formatDateTime(lastSavedAt)}
                />
                <CockpitMetric
                  label="Sync"
                  value={hydrated ? "Online" : "Loading"}
                />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function getDroneVisualNodes(
  count: number,
  prefix: string,
  angleOffset: number,
  radiusOffset: number
): DroneVisualNode[] {
  return Array.from({ length: count }, (_, index) => {
    const ring = getDroneRing(index);
    const angle = angleOffset + (360 / ring.capacity) * ring.index;
    const radians = (angle * Math.PI) / 180;
    const radiusX = Math.min(43, 24 + ring.level * 7 + radiusOffset);
    const radiusY = Math.min(39, 21 + ring.level * 6 + radiusOffset);
    const left = 50 + Math.cos(radians) * radiusX;
    const top = 50 + Math.sin(radians) * radiusY;

    return {
      id: `${prefix}-${index}`,
      left: `${clampVisualPosition(left)}%`,
      top: `${clampVisualPosition(top)}%`,
      delay: (index % 12) * 0.14
    };
  });
}

function getDroneRing(index: number) {
  let remaining = index;
  let level = 0;

  for (;;) {
    const capacity = 6 + level * 4;

    if (remaining < capacity) {
      return {
        level,
        index: remaining,
        capacity
      };
    }

    remaining -= capacity;
    level += 1;
  }
}

function clampVisualPosition(value: number) {
  return Math.min(92, Math.max(8, Number(value.toFixed(2))));
}

function getProductionBars(
  clickPower: number,
  autoIncome: number,
  passiveIncome: number
) {
  const clickOutput = Math.max(0, clickPower);
  const activeOutput = Math.max(0, autoIncome);
  const passiveOutput = Math.max(0, passiveIncome);

  return Array.from({ length: 12 }, (_, index) => {
    const clickPulse = index % 2 === 0 ? 1 : 0.65;
    const activeFlow = 0.55 + index * 0.04;
    const passiveFlow = 0.5 + index * 0.03;
    const output =
      clickOutput * clickPulse +
      activeOutput * activeFlow +
      passiveOutput * passiveFlow;

    return Math.round(12 + Math.min(78, Math.sqrt(output) * 18));
  });
}

function getUpgradeEffectText(upgradeId: string) {
  if (upgradeId === "tap-array") {
    return "x1.28 click";
  }

  if (upgradeId === "micro-drone") {
    return "x1.34 active income";
  }

  if (upgradeId === "harvester-drone") {
    return "x1.22 passive income";
  }

  return "Compounding output";
}

function SectionTitle({
  eyebrow,
  title,
  icon: Icon
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase text-[#c69a5d]">{eyebrow}</p>
        <h2 className="text-lg font-black text-[#fff8eb]">{title}</h2>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#766a58]/45 bg-[#1f211b] text-[#d7c29a]">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function Stat({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;

  return (
    <article className="rounded-lg border border-[#766a58]/45 bg-[#25251e]/90 p-4 shadow-panel backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#a99b87]">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-black text-[#fff8eb]">{stat.value}</p>
          <p className="mt-1 text-sm font-medium text-[#b9ad99]">{stat.detail}</p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${statToneClasses[stat.tone]}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}

function HudBadge({
  label,
  value,
  percent,
  icon: Icon
}: {
  label: string;
  value: string;
  percent: number;
  icon: LucideIcon;
}) {
  return (
    <div className="min-w-[170px] rounded-lg border border-[#766a58]/45 bg-[#1d1f18]/85 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#c69a5d]" />
        <p className="text-xs font-black uppercase text-[#a99b87]">{label}</p>
      </div>
      <p className="mt-2 text-xl font-black text-[#c8d49f]">{value}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#343329]">
        <div
          className="h-full rounded-full bg-[#6f7d5b] transition-all"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function CockpitMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#766a58]/35 bg-[#25251e]/70 px-3 py-2">
      <p className="truncate text-xs font-black uppercase text-[#857b68]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-[#fff8eb]">{value}</p>
    </div>
  );
}

function TelemetryRow({
  label,
  value,
  percent,
  icon: Icon
}: {
  label: string;
  value: string;
  percent: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-[#766a58]/40 bg-[#1f211b]/75 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[#d7c29a]" />
          <p className="truncate text-sm font-bold text-[#fff8eb]">{label}</p>
        </div>
        <p className="shrink-0 text-xs font-black text-[#c8d49f]">{value}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#343329]">
        <div
          className="h-full rounded-full bg-[#c69a5d] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProductionChart({
  clickPower,
  autoIncome,
  passiveIncome,
  activeChain
}: {
  clickPower: number;
  autoIncome: number;
  passiveIncome: number;
  activeChain: number;
}) {
  const productionBars = useMemo(
    () => getProductionBars(clickPower, autoIncome, passiveIncome),
    [clickPower, autoIncome, passiveIncome]
  );

  return (
    <div className="mt-4">
      <div className="flex h-36 items-end gap-2 rounded-lg border border-[#766a58]/40 bg-[#1f211b]/75 p-3">
        {productionBars.map((height, index) => (
          <div
            key={`${height}-${index}`}
            className="flex flex-1 items-end rounded-md bg-[#343329]"
          >
            <div
              className="w-full rounded-md bg-gradient-to-t from-[#6f7d5b] via-[#c69a5d] to-[#e4c487]"
              style={{ height: `${height}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-[#766a58]/35 bg-[#1f211b]/75 p-3">
          <p className="font-bold text-[#a99b87]">Click Output</p>
          <p className="mt-1 font-black text-[#fff8eb]">
            {formatNumber(clickPower)} / click
          </p>
        </div>
        <div className="rounded-lg border border-[#766a58]/35 bg-[#1f211b]/75 p-3">
          <p className="font-bold text-[#a99b87]">Active Output</p>
          <p className="mt-1 font-black text-[#fff8eb]">
            {formatRate(autoIncome)}
          </p>
          <p className="mt-1 text-xs font-bold text-[#857b68]">
            {activeChain > 0 ? "Active" : "Idle"}
          </p>
        </div>
        <div className="rounded-lg border border-[#766a58]/35 bg-[#1f211b]/75 p-3">
          <p className="font-bold text-[#a99b87]">Passive Output</p>
          <p className="mt-1 font-black text-[#fff8eb]">
            {formatRate(passiveIncome)}
          </p>
          <p className="mt-1 text-xs font-bold text-[#857b68]">Always on</p>
        </div>
      </div>
    </div>
  );
}
