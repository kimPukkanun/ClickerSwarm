export type UpgradeDefinition = {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costScale: number;
  clickPower: number;
  autoIncome: number;
  maxLevel?: number;
  theme: "amber" | "cyan" | "green" | "rose" | "violet";
};

export type UpgradeCounts = Record<string, number>;

export type ActiveEvent = {
  id: string;
  endsAt: number;
};

export type SimpleEventDefinition = {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  cooldownMs: number;
  clickMultiplier?: number;
  autoMultiplier?: number;
  instantCurrency?: number;
  theme: "amber" | "cyan" | "green";
};

export type AchievementSnapshot = {
  currency: number;
  lifetimeCurrency: number;
  runCurrency: number;
  totalClicks: number;
  clickPower: number;
  autoIncome: number;
  prestigeLevel: number;
  upgradeCount: number;
};

export type AchievementDefinition = {
  id: string;
  name: string;
  description: string;
  test: (snapshot: AchievementSnapshot) => boolean;
};

export const PRESTIGE_BASE_COST = 10000;

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: "tap-array",
    name: "Tap Array",
    description: "Adds 1 click power.",
    baseCost: 15,
    costScale: 1.15,
    clickPower: 1,
    autoIncome: 0,
    theme: "amber"
  },
  {
    id: "pulse-finger",
    name: "Pulse Finger",
    description: "Adds 5 click power.",
    baseCost: 120,
    costScale: 1.2,
    clickPower: 5,
    autoIncome: 0,
    theme: "rose"
  },
  {
    id: "micro-drone",
    name: "Micro Drone",
    description: "Adds 1 auto income per second.",
    baseCost: 60,
    costScale: 1.18,
    clickPower: 0,
    autoIncome: 1,
    theme: "cyan"
  },
  {
    id: "harvest-loop",
    name: "Harvest Loop",
    description: "Adds 8 auto income per second.",
    baseCost: 550,
    costScale: 1.22,
    clickPower: 0,
    autoIncome: 8,
    theme: "green"
  },
  {
    id: "overclock-core",
    name: "Overclock Core",
    description: "Adds 18 click power and 18 auto income.",
    baseCost: 2400,
    costScale: 1.28,
    clickPower: 18,
    autoIncome: 18,
    theme: "violet"
  }
];

export const SIMPLE_EVENTS: SimpleEventDefinition[] = [
  {
    id: "surge-window",
    name: "Surge Window",
    description: "Click power is doubled.",
    durationMs: 30000,
    cooldownMs: 45000,
    clickMultiplier: 2,
    theme: "amber"
  },
  {
    id: "steady-loop",
    name: "Steady Loop",
    description: "Auto income is doubled.",
    durationMs: 30000,
    cooldownMs: 45000,
    autoMultiplier: 2,
    theme: "cyan"
  },
  {
    id: "cache-drop",
    name: "Cache Drop",
    description: "Instant currency payout.",
    durationMs: 0,
    cooldownMs: 30000,
    instantCurrency: 750,
    theme: "green"
  }
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "first-click",
    name: "First Click",
    description: "Click once.",
    test: (snapshot) => snapshot.totalClicks >= 1
  },
  {
    id: "hundred-clicks",
    name: "Busy Hands",
    description: "Click 100 times.",
    test: (snapshot) => snapshot.totalClicks >= 100
  },
  {
    id: "first-upgrade",
    name: "Shop Open",
    description: "Buy any upgrade.",
    test: (snapshot) => snapshot.upgradeCount >= 1
  },
  {
    id: "auto-start",
    name: "Hands Free",
    description: "Reach 1 auto income per second.",
    test: (snapshot) => snapshot.autoIncome >= 1
  },
  {
    id: "ten-thousand",
    name: "Spark Vault",
    description: "Earn 10,000 currency in one run.",
    test: (snapshot) => snapshot.runCurrency >= 10000
  },
  {
    id: "first-prestige",
    name: "Fresh Cycle",
    description: "Prestige once.",
    test: (snapshot) => snapshot.prestigeLevel >= 1
  }
];

export function createUpgradeCounts() {
  return Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 0]));
}

export function getUpgradeCost(upgrade: UpgradeDefinition, count: number) {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, count));
}

export function getPrestigeMultiplier(prestigePoints: number) {
  return 1 + prestigePoints * 0.12;
}

export function getPrestigeGain(runCurrency: number) {
  return Math.floor(Math.sqrt(runCurrency / PRESTIGE_BASE_COST));
}

export function getNextPrestigeTarget(runCurrency: number) {
  const nextPoint = getPrestigeGain(runCurrency) + 1;

  return PRESTIGE_BASE_COST * nextPoint * nextPoint;
}

export function getActiveEventDefinition(
  activeEvent: ActiveEvent | null,
  now = Date.now()
) {
  if (!activeEvent || activeEvent.endsAt <= now) {
    return null;
  }

  return SIMPLE_EVENTS.find((event) => event.id === activeEvent.id) ?? null;
}

export function getClickPowerValue(
  upgrades: UpgradeCounts,
  prestigePoints: number,
  activeEvent: ActiveEvent | null,
  now = Date.now()
) {
  const upgradePower = UPGRADES.reduce((total, upgrade) => {
    return total + (upgrades[upgrade.id] ?? 0) * upgrade.clickPower;
  }, 0);
  const event = getActiveEventDefinition(activeEvent, now);
  const eventMultiplier = event?.clickMultiplier ?? 1;
  const value = (1 + upgradePower) * getPrestigeMultiplier(prestigePoints);

  return Number((value * eventMultiplier).toFixed(2));
}

export function getAutoIncomeValue(
  upgrades: UpgradeCounts,
  prestigePoints: number,
  activeEvent: ActiveEvent | null,
  now = Date.now()
) {
  const upgradeIncome = UPGRADES.reduce((total, upgrade) => {
    return total + (upgrades[upgrade.id] ?? 0) * upgrade.autoIncome;
  }, 0);
  const event = getActiveEventDefinition(activeEvent, now);
  const eventMultiplier = event?.autoMultiplier ?? 1;
  const value = upgradeIncome * getPrestigeMultiplier(prestigePoints);

  return Number((value * eventMultiplier).toFixed(2));
}

export function getUpgradeCount(upgrades: UpgradeCounts) {
  return Object.values(upgrades).reduce((total, count) => total + count, 0);
}
