# ClickerSwarm

A small expandable clicker game base built with Next.js, React, TypeScript, Zustand, Framer Motion, Tailwind, and localStorage persistence.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Game Systems

- Currency and click power are calculated in `src/game/game-data.ts`.
- Auto income runs from the Zustand tick loop in `src/game/game-store.ts`.
- Upgrade shop definitions live in `UPGRADES`.
- Prestige math lives near `PRESTIGE_BASE_COST`.
- Achievements live in `ACHIEVEMENTS`.
- Timed and instant events live in `SIMPLE_EVENTS`.
- Saves use Zustand persistence with localStorage under `clicker-swarm-save-v1`.

To add content, extend the arrays in `src/game/game-data.ts`. The UI will pick up new upgrades, achievements, and events without new layout code.
