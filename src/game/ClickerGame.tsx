"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Clock,
  Coins,
  MousePointerClick,
  RefreshCw,
  RotateCcw,
  Save,
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
import { useGameStore } from "./game-store";

type FloatingGain = {
  id: number;
  amount: number;
  x: number;
};

const upgradeIcons: Record<string, LucideIcon> = {
  "tap-array": MousePointerClick,
  "micro-drone": Activity
};

const themeClasses = {
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700"
};

export function ClickerGame() {
  const [hydrated, setHydrated] = useState(false);
  const [floatingGains, setFloatingGains] = useState<FloatingGain[]>([]);
  const currency = useGameStore((state) => state.currency);
  const lifetimeCurrency = useGameStore((state) => state.lifetimeCurrency);
  const runCurrency = useGameStore((state) => state.runCurrency);
  const totalClicks = useGameStore((state) => state.totalClicks);
  const upgrades = useGameStore((state) => state.upgrades);
  const achievements = useGameStore((state) => state.achievements);
  const prestigeLevel = useGameStore((state) => state.prestigeLevel);
  const prestigePoints = useGameStore((state) => state.prestigePoints);
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

  function handleClick() {
    const id = Date.now();
    const x = Math.round(Math.random() * 72) - 36;

    click();
    setFloatingGains((items) => [
      ...items.slice(-5),
      {
        id,
        amount: clickPower,
        x
      }
    ]);
  }

  function handleResetSave() {
    if (window.confirm("Reset this save and start over?")) {
      resetSave();
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-cyan-700">
              ClickerSwarm
            </p>
            <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
              Swarm Core
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Currency" value={formatNumber(currency)} icon={Coins} />
            <Stat label="Click Power" value={formatNumber(clickPower)} icon={MousePointerClick} />
            <Stat label="Auto Income" value={formatRate(autoIncome)} icon={Clock} />
            <Stat label="Prestige" value={`${prestigeLevel} / ${prestigePoints}`} icon={Trophy} />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(320px,1fr)_minmax(360px,1.1fr)_minmax(300px,0.9fr)]">
          <div className="flex flex-col gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Currency</h2>
                  <p className="text-sm text-slate-500">
                    Lifetime {formatNumber(lifetimeCurrency)}
                  </p>
                </div>
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">
                  {formatNumber(currency)}
                </span>
              </div>

              <div className="relative mt-6 flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px]" />
                <AnimatePresence>
                  {floatingGains.map((gain) => (
                    <motion.div
                      key={gain.id}
                      className="pointer-events-none absolute left-1/2 top-20 rounded-lg bg-white px-3 py-1 text-sm font-bold text-amber-600 shadow-lg"
                      initial={{ opacity: 0, y: 20, x: gain.x }}
                      animate={{ opacity: 1, y: -40, x: gain.x }}
                      exit={{ opacity: 0, y: -80 }}
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
                  title="Click"
                  onClick={handleClick}
                  whileTap={{ scale: 0.94 }}
                  className="relative flex h-56 w-56 items-center justify-center rounded-full border-4 border-amber-300 bg-white shadow-[0_24px_70px_rgba(245,158,11,0.35)] focus:outline-none focus:ring-4 focus:ring-amber-200"
                >
                  <img
                    src="/swarm-core.svg"
                    alt="Swarm core"
                    className="h-44 w-44"
                    draggable={false}
                  />
                </motion.button>
              </div>
            </section>


          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Upgrade Shop</h2>
                <p className="text-sm text-slate-500">
                  Click power and auto income scale with prestige.
                </p>
              </div>
              <Zap className="h-5 w-5 text-amber-500" />
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {upgradeRows.map((upgrade) => {
                const canAfford = currency >= upgrade.cost;
                const Icon = upgrade.Icon;

                return (
                  <article
                    key={upgrade.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${themeClasses[upgrade.theme]}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-950">{upgrade.name}</h3>
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                            Lv {upgrade.count}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {upgrade.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                          {upgrade.clickPower > 0 && (
                            <span>+{formatNumber(upgrade.clickPower)} click</span>
                          )}
                          {upgrade.autoIncome > 0 && (
                            <span>+{formatRate(upgrade.autoIncome)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      title={`Buy ${upgrade.name}`}
                      onClick={() => buyUpgrade(upgrade.id)}
                      disabled={!canAfford}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Coins className="h-4 w-4" />
                      Buy {formatNumber(upgrade.cost)}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Prestige</h2>
                  <p className="text-sm text-slate-500">
                    Multiplier x{getPrestigeMultiplier(prestigePoints).toFixed(2)}
                  </p>
                </div>
                <Trophy className="h-5 w-5 text-violet-600" />
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm font-semibold text-slate-600">
                  <span>Run {formatNumber(runCurrency)}</span>
                  <span>Next {formatNumber(nextPrestigeTarget)}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-lg bg-slate-100">
                  <div
                    className="h-full rounded-lg bg-violet-600 transition-all"
                    style={{ width: `${prestigeProgress}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                title="Prestige"
                onClick={prestige}
                disabled={prestigeGain <= 0}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <RefreshCw className="h-4 w-4" />
                Prestige +{formatNumber(prestigeGain)}
              </button>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Achievements</h2>
                  <p className="text-sm text-slate-500">
                    {unlockedAchievementCount} / {ACHIEVEMENTS.length}
                  </p>
                </div>
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>

              <div className="mt-4 grid gap-2">
                {ACHIEVEMENTS.map((achievement) => {
                  const unlocked = Boolean(achievements[achievement.id]);

                  return (
                    <div
                      key={achievement.id}
                      className={`rounded-lg border p-3 ${
                        unlocked
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-950">
                          {achievement.name}
                        </p>
                        <span className="text-xs font-bold text-slate-500">
                          {unlocked ? "Unlocked" : "Locked"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {achievement.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Save System</h2>
                  <p className="text-sm text-slate-500">
                    Saved {formatDateTime(lastSavedAt)}
                  </p>
                </div>
                <Save className="h-5 w-5 text-cyan-700" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  title="Save now"
                  onClick={saveNow}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  title="Reset save"
                  onClick={handleResetSave}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-lg font-bold text-slate-950">Activity</h2>
              <div className="mt-4 flex max-h-72 flex-col gap-2 overflow-auto pr-1">
                {log.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-950">
                        {entry.title}
                      </p>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{entry.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-base font-bold text-slate-950">{value}</p>
    </div>
  );
}
