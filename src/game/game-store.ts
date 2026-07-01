import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  ACHIEVEMENTS,
  UPGRADES,
  type UpgradeCounts,
  createUpgradeCounts,
  getAutoIncomeValue,
  getClickPowerValue,
  getPrestigeGain,
  getUpgradeCost,
  getUpgradeCount
} from "./game-data";

const SAVE_KEY = "clicker-swarm-save-v1";
const MAX_IDLE_MS = 60 * 60 * 1000;
const MAX_LOG_ITEMS = 18;

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
  lastSavedAt: number;
  lastTickAt: number;
  log: GameLogEntry[];
  click: () => void;
  buyUpgrade: (upgradeId: string) => boolean;
  tick: (now?: number) => void;
  prestige: () => boolean;
  saveNow: () => void;
  resetSave: () => void;
  checkAchievements: () => void;
  getClickPower: () => number;
  getAutoIncome: () => number;
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

function getAchievementSnapshot(state: GameState) {
  return {
    currency: state.currency,
    lifetimeCurrency: state.lifetimeCurrency,
    runCurrency: state.runCurrency,
    totalClicks: state.totalClicks,
    clickPower: getClickPowerValue(
      state.upgrades,
      state.prestigePoints
    ),
    autoIncome: getAutoIncomeValue(
      state.upgrades,
      state.prestigePoints
    ),
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
        const amount = get().getClickPower();

        set((state) => ({
          ...addCurrency(state, amount),
          totalClicks: state.totalClicks + 1,
          lastSavedAt: now
        }));
        get().checkAchievements();
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
        const elapsedMs = Math.max(
          0,
          Math.min(now - state.lastTickAt, MAX_IDLE_MS)
        );
        const autoIncome = getAutoIncomeValue(
          state.upgrades,
          state.prestigePoints
        );
        const earned = Number(((autoIncome * elapsedMs) / 1000).toFixed(2));

        set((current) => ({
          ...addCurrency(current, earned),
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

        return getClickPowerValue(
          state.upgrades,
          state.prestigePoints
        );
      },
      getAutoIncome: () => {
        const state = get();

        return getAutoIncomeValue(
          state.upgrades,
          state.prestigePoints
        );
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
          log: saved.log?.slice(0, MAX_LOG_ITEMS) ?? currentState.log
        };
      }
    }
  )
);
