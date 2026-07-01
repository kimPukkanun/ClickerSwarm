import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  ACHIEVEMENTS,
  UPGRADES,
  type FormationId,
  type UpgradeCounts,
  createUpgradeCounts,
  getActiveSurgeMultiplier,
  getAutoIncomeValue,
  getClickPowerValue,
  getFormation,
  getUnlockedFormation,
  isFormationUnlocked,
  getPassiveIncomeValue,
  getPrestigeGain,
  getTotalIncomeValue,
  getUpgradeCost,
  getUpgradeCount
} from "./game-data";

const SAVE_KEY = "clicker-swarm-save-v1";
const MAX_IDLE_MS = 60 * 60 * 1000;
const MAX_LOG_ITEMS = 18;
const ACTIVE_CHAIN_WINDOW_MS = 1600;
const ACTIVE_CHAIN_DECAY_MS = 1200;
const MAX_ACTIVE_CHAIN = 120;

export type GameLogType =
  | "click"
  | "upgrade"
  | "achievement"
  | "prestige"
  | "event"
  | "save";

export type GameLogEntry = {
  id: string;
  type: GameLogType;
  title: string;
  detail: string;
  createdAt: number;
};

type GameSave = Pick<
  GameState,
  | "currency"
  | "lifetimeCurrency"
  | "runCurrency"
  | "totalClicks"
  | "upgrades"
  | "achievements"
  | "prestigeLevel"
  | "prestigePoints"
  | "formationId"
  | "activeChain"
  | "lastClickAt"
  | "lastSavedAt"
  | "lastTickAt"
  | "log"
>;

export type GameState = {
  currency: number;
  lifetimeCurrency: number;
  runCurrency: number;
  totalClicks: number;
  upgrades: UpgradeCounts;
  achievements: Record<string, number>;
  prestigeLevel: number;
  prestigePoints: number;
  formationId: FormationId;
  activeChain: number;
  lastClickAt: number;
  lastSavedAt: number;
  lastTickAt: number;
  log: GameLogEntry[];
  click: () => number;
  buyUpgrade: (upgradeId: string) => boolean;
  tick: (now?: number) => void;
  prestige: () => boolean;
  saveNow: () => void;
  resetSave: () => void;
  setFormation: (formationId: FormationId) => boolean;
  checkAchievements: () => void;
  getClickPower: () => number;
  getAutoIncome: () => number;
  getPassiveIncome: () => number;
  getActiveSurge: () => number;
  getPrestigeGain: () => number;
};

function createLog(
  type: GameLogType,
  title: string,
  detail: string,
  createdAt = Date.now()
) {
  const id =
    createdAt === 0
      ? `${type}-${title.toLowerCase().replaceAll(" ", "-")}`
      : `${createdAt}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    type,
    title,
    detail,
    createdAt
  };
}

function pushLog(log: GameLogEntry[], entry: GameLogEntry) {
  return [entry, ...log].slice(0, MAX_LOG_ITEMS);
}

function createBaseState(createdAt = 0): GameSave {
  return {
    currency: 0,
    lifetimeCurrency: 0,
    runCurrency: 0,
    totalClicks: 0,
    upgrades: createUpgradeCounts(),
    achievements: {},
    prestigeLevel: 0,
    prestigePoints: 0,
    formationId: "balanced",
    activeChain: 0,
    lastClickAt: 0,
    lastSavedAt: createdAt,
    lastTickAt: createdAt,
    log: [
      createLog(
        "save",
        "New Save",
        "Currency, upgrades, prestige, and achievements are tracked.",
        createdAt
      )
    ]
  };
}

function addCurrency(state: GameState, amount: number) {
  if (amount <= 0) {
    return state;
  }

  return {
    currency: state.currency + amount,
    lifetimeCurrency: state.lifetimeCurrency + amount,
    runCurrency: state.runCurrency + amount
  };
}

function getNextActiveChain(state: GameState, now: number) {
  const recentClick = now - state.lastClickAt <= ACTIVE_CHAIN_WINDOW_MS;

  if (!recentClick) {
    return 1;
  }

  return Math.min(state.activeChain + 1, MAX_ACTIVE_CHAIN);
}

function getDecayedActiveChain(state: GameState, now: number) {
  if (state.activeChain <= 0 || state.lastClickAt <= 0) {
    return 0;
  }

  const idleMs = now - state.lastClickAt;

  if (idleMs <= ACTIVE_CHAIN_WINDOW_MS) {
    return state.activeChain;
  }

  const decaySteps = Math.floor(
    (idleMs - ACTIVE_CHAIN_WINDOW_MS) / ACTIVE_CHAIN_DECAY_MS
  ) + 1;

  return Math.max(0, state.activeChain - decaySteps);
}

function getActiveSurgeValue(activeChain: number, formationId: FormationId) {
  const baseSurge = getActiveSurgeMultiplier(activeChain);
  const formation = getFormation(formationId);
  const surgeBonus = Math.max(0, baseSurge - 1) * formation.multipliers.surgeBonus;

  return Number((1 + surgeBonus).toFixed(2));
}

function getAchievementSnapshot(state: GameState) {
  const formation = getUnlockedFormation(state.formationId, state.upgrades);

  return {
    currency: state.currency,
    lifetimeCurrency: state.lifetimeCurrency,
    runCurrency: state.runCurrency,
    totalClicks: state.totalClicks,
    clickPower: Number(
      (
        getClickPowerValue(state.upgrades, state.prestigePoints) *
        formation.multipliers.clickPower
      ).toFixed(2)
    ),
    autoIncome: Number(
      (
        getTotalIncomeValue(state.upgrades, state.prestigePoints) *
        Math.max(
          formation.multipliers.activeIncome,
          formation.multipliers.passiveIncome
        )
      ).toFixed(2)
    ),
    activeSurge: getActiveSurgeValue(state.activeChain, formation.id),
    prestigeLevel: state.prestigeLevel,
    upgradeCount: getUpgradeCount(state.upgrades)
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createBaseState(),
      click: () => {
        const now = Date.now();
        const state = get();
        const formation = getUnlockedFormation(state.formationId, state.upgrades);
        const activeChain = getNextActiveChain(state, now);
        const amount = Number(
          (
            getClickPowerValue(state.upgrades, state.prestigePoints) *
            formation.multipliers.clickPower *
            getActiveSurgeValue(activeChain, formation.id)
          ).toFixed(2)
        );

        set((state) => ({
          ...addCurrency(state, amount),
          totalClicks: state.totalClicks + 1,
          activeChain,
          lastClickAt: now,
          lastSavedAt: now
        }));
        get().checkAchievements();

        return amount;
      },
      buyUpgrade: (upgradeId) => {
        const upgrade = UPGRADES.find((item) => item.id === upgradeId);

        if (!upgrade) {
          return false;
        }

        const state = get();
        const count = state.upgrades[upgradeId] ?? 0;

        if (upgrade.maxLevel && count >= upgrade.maxLevel) {
          return false;
        }

        const cost = getUpgradeCost(upgrade, count);

        if (state.currency < cost) {
          return false;
        }

        set((current) => ({
          currency: current.currency - cost,
          upgrades: {
            ...current.upgrades,
            [upgradeId]: count + 1
          },
          lastSavedAt: Date.now(),
          log: pushLog(
            current.log,
            createLog("upgrade", upgrade.name, `Bought level ${count + 1}.`)
          )
        }));
        get().checkAchievements();

        return true;
      },
      tick: (now = Date.now()) => {
        const state = get();
        const formation = getUnlockedFormation(state.formationId, state.upgrades);
        const activeChain = getDecayedActiveChain(state, now);
        const activeSurge = getActiveSurgeValue(activeChain, formation.id);
        const elapsedMs = Math.max(
          0,
          Math.min(now - state.lastTickAt, MAX_IDLE_MS)
        );
        const autoIncome = getAutoIncomeValue(
          state.upgrades,
          state.prestigePoints
        );
        const passiveIncome = getPassiveIncomeValue(
          state.upgrades,
          state.prestigePoints
        );
        const activeIncome =
          activeChain > 0
            ? autoIncome * formation.multipliers.activeIncome * activeSurge
            : 0;
        const passiveOutput =
          passiveIncome * formation.multipliers.passiveIncome;
        const earned =
          activeIncome + passiveOutput > 0
            ? Number(
                (((activeIncome + passiveOutput) / 1000) * elapsedMs).toFixed(2)
              )
            : 0;

        set((current) => ({
          ...addCurrency(current, earned),
          formationId: formation.id,
          activeChain,
          lastTickAt: now,
          lastSavedAt: now
        }));

        if (earned > 0) {
          get().checkAchievements();
        }
      },

      prestige: () => {
        const gain = get().getPrestigeGain();

        if (gain <= 0) {
          return false;
        }

        const now = Date.now();

        set((state) => ({
          currency: 0,
          runCurrency: 0,
          upgrades: createUpgradeCounts(),
          formationId: "balanced",
          activeChain: 0,
          lastClickAt: 0,
          prestigeLevel: state.prestigeLevel + 1,
          prestigePoints: state.prestigePoints + gain,
          lastSavedAt: now,
          lastTickAt: now,
          log: pushLog(
            state.log,
            createLog("prestige", "Prestige", `Gained ${gain} prestige points.`)
          )
        }));
        get().checkAchievements();

        return true;
      },
      saveNow: () => {
        set((state) => ({
          lastSavedAt: Date.now(),
          log: pushLog(
            state.log,
            createLog("save", "Saved", "Progress stored in localStorage.")
          )
        }));
      },
      resetSave: () => {
        const now = Date.now();

        set({
          ...createBaseState(now),
          log: [createLog("save", "Save Reset", "Started a fresh run.", now)]
        });
      },
      setFormation: (formationId) => {
        const state = get();
        const formation = getFormation(formationId);

        if (!isFormationUnlocked(formation, state.upgrades)) {
          return false;
        }

        set((current) => ({
          formationId,
          lastSavedAt: Date.now(),
          log: pushLog(
            current.log,
            createLog("event", "Formation", `${formation.name} selected.`)
          )
        }));

        return true;
      },
      checkAchievements: () => {
        const state = get();
        const snapshot = getAchievementSnapshot(state);
        const unlocked = ACHIEVEMENTS.filter((achievement) => {
          return !state.achievements[achievement.id] && achievement.test(snapshot);
        });

        if (unlocked.length === 0) {
          return;
        }

        set((current) => {
          const achievements = { ...current.achievements };
          let log = current.log;
          const now = Date.now();

          for (const achievement of unlocked) {
            achievements[achievement.id] = now;
            log = pushLog(
              log,
              createLog("achievement", achievement.name, achievement.description)
            );
          }

          return {
            achievements,
            log,
            lastSavedAt: now
          };
        });
      },
      getClickPower: () => {
        const state = get();
        const formation = getUnlockedFormation(state.formationId, state.upgrades);

        return Number(
          (
            getClickPowerValue(state.upgrades, state.prestigePoints) *
            formation.multipliers.clickPower *
            getActiveSurgeValue(state.activeChain, formation.id)
          ).toFixed(2)
        );
      },
      getAutoIncome: () => {
        const state = get();
        const formation = getUnlockedFormation(state.formationId, state.upgrades);

        if (state.activeChain <= 0) {
          return 0;
        }

        return Number(
          (
            getAutoIncomeValue(state.upgrades, state.prestigePoints) *
            formation.multipliers.activeIncome *
            getActiveSurgeValue(state.activeChain, formation.id)
          ).toFixed(2)
        );
      },
      getPassiveIncome: () => {
        const state = get();
        const formation = getUnlockedFormation(state.formationId, state.upgrades);

        return Number(
          (
            getPassiveIncomeValue(state.upgrades, state.prestigePoints) *
            formation.multipliers.passiveIncome
          ).toFixed(2)
        );
      },
      getActiveSurge: () => {
        const state = get();
        const formation = getUnlockedFormation(state.formationId, state.upgrades);

        return getActiveSurgeValue(state.activeChain, formation.id);
      },
      getPrestigeGain: () => {
        return getPrestigeGain(get().runCurrency);
      }
    }),
    {
      name: SAVE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state): GameSave => ({
        currency: state.currency,
        lifetimeCurrency: state.lifetimeCurrency,
        runCurrency: state.runCurrency,
        totalClicks: state.totalClicks,
        upgrades: state.upgrades,
        achievements: state.achievements,
        prestigeLevel: state.prestigeLevel,
        prestigePoints: state.prestigePoints,
        formationId: state.formationId,
        activeChain: state.activeChain,
        lastClickAt: state.lastClickAt,
        lastSavedAt: state.lastSavedAt,
        lastTickAt: state.lastTickAt,
        log: state.log
      }),
      merge: (persistedState, currentState) => {
        const saved = persistedState as Partial<GameSave> | undefined;

        if (!saved) {
          return currentState;
        }

        return {
          ...currentState,
          ...saved,
          upgrades: {
            ...createUpgradeCounts(),
            ...(saved.upgrades ?? {})
          },
          achievements: saved.achievements ?? {},
          formationId: saved.formationId ?? "balanced",
          activeChain: saved.activeChain ?? 0,
          lastClickAt: saved.lastClickAt ?? 0,
          log: saved.log?.slice(0, MAX_LOG_ITEMS) ?? currentState.log
        };
      }
    }
  )
);
