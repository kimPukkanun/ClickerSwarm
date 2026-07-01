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

export type FormationId =
  | "balanced"
  | "harvest"
  | "strike"
  | "tap-net";

export type FormationDefinition = {
  id: FormationId;
  name: string;
  description: string;
  requirement: string;
  requiredUpgradeId?: string;
  requiredUpgradeCount?: number;
  multipliers: {
    clickPower: number;
    activeIncome: number;
    passiveIncome: number;
    surgeBonus: number;
  };
};

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

export const FORMATIONS: FormationDefinition[] = [
  {
    id: "balanced",
    name: "Balanced Orbit",
    description: "Keeps the swarm neutral with no tradeoffs.",
    requirement: "Unlocked",
    multipliers: {
      clickPower: 1,
      activeIncome: 1,
      passiveIncome: 1,
      surgeBonus: 1
    }
  },
  {
    id: "harvest",
    name: "Harvest Spiral",
    description: "Boosts passive harvesters, but weakens active surge output.",
    requirement: "Requires 1 Harvester Drone",
    requiredUpgradeId: "harvester-drone",
    requiredUpgradeCount: 1,
    multipliers: {
      clickPower: 0.9,
      activeIncome: 0.85,
      passiveIncome: 1.6,
      surgeBonus: 0.7
    }
  },
  {
    id: "strike",
    name: "Strike Wing",
    description: "Boosts active drones and surge, but slows passive gains.",
    requirement: "Requires 1 Micro Drone",
    requiredUpgradeId: "micro-drone",
    requiredUpgradeCount: 1,
    multipliers: {
      clickPower: 1.05,
      activeIncome: 1.35,
      passiveIncome: 0.7,
      surgeBonus: 1.2
    }
  },
  {
    id: "tap-net",
    name: "Tap Net",
    description: "Focuses the swarm around direct tapping.",
    requirement: "Requires 5 Tap Array levels",
    requiredUpgradeId: "tap-array",
    requiredUpgradeCount: 5,
    multipliers: {
      clickPower: 1.45,
      activeIncome: 0.9,
      passiveIncome: 0.8,
      surgeBonus: 0.9
    }
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

export function getFormation(formationId: FormationId) {
  return FORMATIONS.find((formation) => formation.id === formationId) ?? FORMATIONS[0];
}

export function isFormationUnlocked(
  formation: FormationDefinition,
  upgrades: UpgradeCounts
) {
  if (!formation.requiredUpgradeId) {
    return true;
  }

  return (
    (upgrades[formation.requiredUpgradeId] ?? 0) >=
    (formation.requiredUpgradeCount ?? 0)
  );
}

export function getUnlockedFormation(
  formationId: FormationId,
  upgrades: UpgradeCounts
) {
  const formation = getFormation(formationId);

  if (isFormationUnlocked(formation, upgrades)) {
    return formation;
  }

  return FORMATIONS[0];
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
