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
    id: "micro-drone",
    name: "Micro Drone",
    description: "Adds 1 auto income per second.",
    baseCost: 60,
    costScale: 1.15,
    clickPower: 0,
    autoIncome: 1,
    theme: "cyan"
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

export function getClickPowerValue(
  upgrades: UpgradeCounts,
  prestigePoints: number
) {
  const upgradePower = UPGRADES.reduce((total, upgrade) => {
    return total + (upgrades[upgrade.id] ?? 0) * upgrade.clickPower;
  }, 0);
  const value = (1 + upgradePower) * getPrestigeMultiplier(prestigePoints);

  return Number(value.toFixed(2));
}

export function getAutoIncomeValue(
  upgrades: UpgradeCounts,
  prestigePoints: number
) {
  const upgradeIncome = UPGRADES.reduce((total, upgrade) => {
    return total + (upgrades[upgrade.id] ?? 0) * upgrade.autoIncome;
  }, 0);
  const value = upgradeIncome * getPrestigeMultiplier(prestigePoints);

  return Number(value.toFixed(2));
}

export function getUpgradeCount(upgrades: UpgradeCounts) {
  return Object.values(upgrades).reduce((total, count) => total + count, 0);
}
