# BATTLESHIP

A full-featured, single-player Battleship game built with React 19, TypeScript 5.9, and Vite 6. Play against four AI difficulty tiers — from erratic random fire to a near-optimal probability-density engine.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
  - [Running Tests](#running-tests)
  - [Building for Production](#building-for-production)
- [AI Difficulty Tiers](#ai-difficulty-tiers)
- [Scoring System](#scoring-system)
- [Scripts Reference](#scripts-reference)

---

## Features

- Four AI difficulty tiers with distinct targeting strategies
- Full fleet placement: manual (drag/keyboard) or randomised
- Real-time combat log with hit, miss, sunk, and system entries
- Post-game rank and score (Private → General of the Armies)
- Session statistics that persist across games within a session
- Keyboard navigation throughout — fully playable without a mouse
- Responsive layout, military-terminal aesthetic

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| UI         | React 19, TypeScript 5.9            |
| Build      | Vite 6                              |
| Styling    | Plain CSS (CSS custom properties)   |
| Testing    | Jest 30, ts-jest, Testing Library   |
| Fonts      | Orbitron, Share Tech Mono (Google)  |

---

## Project Structure

```
battleship/
├── src/
│   ├── ai/
│   │   └── opponent.ts          # All four AI strategies + Option-3 tracking
│   ├── components/
│   │   ├── App.tsx
│   │   ├── BoardGrid.tsx
│   │   ├── Cell.tsx
│   │   ├── CombatLog.tsx
│   │   ├── DifficultySelect.tsx
│   │   ├── FleetRoster.tsx
│   │   ├── GameOver.tsx
│   │   ├── GameScreen.tsx
│   │   └── SetupScreen.tsx
│   ├── hooks/
│   │   ├── useGameState.ts      # Central game state + AI timer management
│   │   └── useSessionStats.ts   # Cross-game session statistics
│   ├── models/
│   │   ├── Board.ts
│   │   ├── Game.ts
│   │   ├── Ship.ts
│   │   └── types.ts
│   ├── styles/
│   │   └── global.css
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   └── scoring.ts
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── netlify.toml
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 20 or later ([nodejs.org](https://nodejs.org))
- **npm** 9 or later (bundled with Node)

Verify your versions:

```bash
node -v   # should print v20.x.x or higher
npm -v    # should print 9.x.x or higher
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/battleship.git
cd battleship

# 2. Install dependencies
npm install
```

### Running Locally

```bash
npm run dev
```

Vite will start a dev server at **http://localhost:3000** and open your browser automatically. Hot module replacement is enabled — edits to any source file reflect instantly.

### Running Tests

```bash
# Run the full test suite (≈ 1 000 tests across 19 files)
npm test

# Watch mode — re-runs affected tests on save
npm run test:watch
```

Tests use Jest 30 with ts-jest and jsdom. No browser required.

### Building for Production

```bash
npm run build
```

Output lands in `dist/`. To preview the production build locally before deploying:

```bash
npm run preview
# Opens http://localhost:4173
```

---

## Deployment

### Netlify

The repo ships with a `netlify.toml` that configures everything automatically.


---
## AI Difficulty Tiers

| Tier   | Codename  | Strategy                                                                 |
|--------|-----------|--------------------------------------------------------------------------|
| Easy   | ERRATIC   | Pure random fire. Never enters target mode after a hit.                  |
| Medium | HUNTER    | Checkerboard hunt pattern. Converges on hits with axis-backtrack logic.  |
| Hard   | PREDATOR  | Density-weighted hunt biased toward the largest remaining ship.          |
| Sweaty | ORACLE    | Full probability density across all remaining ships. Near-optimal.       |

All tiers above Easy share the same multi-ship tracking system (Option 3): if the AI hits two ships simultaneously it will never abandon a confirmed hit even after sinking an adjacent vessel.

---

## Scoring System

Scoring is based on **player shots only** (AI attacks do not count against you).

```
score = floor( 17 / player_shots_fired × 100 )  clamped to [0, 100]
```

| Score | Rank                  |
|-------|-----------------------|
| 100   | General of the Armies |
| 90–99 | Admiral               |
| 69–89 | Captain               |
| 36–68 | Sergeant              |
| 0–35  | Private               |

A perfect game — sinking all 17 ship cells in exactly 17 shots — scores 100%.

---

## Scripts Reference

| Script              | Description                              |
|---------------------|------------------------------------------|
| `npm run dev`       | Start Vite dev server at localhost:3000  |
| `npm run build`     | Type-check + production build → dist/   |
| `npm run preview`   | Serve the production build locally       |
| `npm test`          | Run the full Jest test suite             |
| `npm run test:watch`| Jest in watch mode                       |
