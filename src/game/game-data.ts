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
  activeSurge: number;
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
    description: "Compounds click power.",
    baseCost: 15,
    costScale: 1.22,
    clickPower: 1,
    autoIncome: 0,
    theme: "amber"
  },
  {
    id: "micro-drone",
    name: "Micro Drone",
    description: "Compounds active swarm income.",
    baseCost: 60,
    costScale: 1.24,
    clickPower: 0,
    autoIncome: 1,
    theme: "cyan"
  },
  {
    id: "harvester-drone",
    name: "Harvester Drone",
    description: "Compounds passive income while idle.",
    baseCost: 140,
    costScale: 1.26,
    clickPower: 0,
    autoIncome: 1,
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
  return Math.pow(1.12, prestigePoints);
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
  const tapArrayCount = upgrades["tap-array"] ?? 0;
  const value =
    Math.pow(1.28, tapArrayCount) * getPrestigeMultiplier(prestigePoints);

  return Number(value.toFixed(2));
}

export function getAutoIncomeValue(
  upgrades: UpgradeCounts,
  prestigePoints: number
) {
  const microDroneCount = upgrades["micro-drone"] ?? 0;

  if (microDroneCount <= 0) {
    return 0;
  }

  const value =
    Math.pow(1.34, microDroneCount - 1) *
    getPrestigeMultiplier(prestigePoints);

  return Number(value.toFixed(2));
}

export function getPassiveIncomeValue(
  upgrades: UpgradeCounts,
  prestigePoints: number
) {
  const harvesterDroneCount = upgrades["harvester-drone"] ?? 0;

  if (harvesterDroneCount <= 0) {
    return 0;
  }

  const value =
    Math.pow(1.22, harvesterDroneCount - 1) *
    getPrestigeMultiplier(prestigePoints);

  return Number(value.toFixed(2));
}

export function getTotalIncomeValue(
  upgrades: UpgradeCounts,
  prestigePoints: number
) {
  return Number(
    (
      getAutoIncomeValue(upgrades, prestigePoints) +
      getPassiveIncomeValue(upgrades, prestigePoints)
    ).toFixed(2)
  );
}

export function getUpgradeCount(upgrades: UpgradeCounts) {
  return Object.values(upgrades).reduce((total, count) => total + count, 0);
}

export function getActiveSurgeMultiplier(activeChain: number) {
  const chain = Math.max(0, Math.min(activeChain, 120));
  const value = Math.pow(1.025, chain);

  return Number(Math.min(value, 12).toFixed(2));
}
