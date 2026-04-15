# BATTLESHIP

A full-featured Battleship game built with React 19, TypeScript 5.9, and Vite 6. Play solo against four AI difficulty tiers — from random fire to a near-optimal probability-density engine — or go head-to-head against another player in Local PvP mode on the same device. A full hybrid audio system synthesises all sound effects in-browser via the Web Audio API and streams MP3 background music matched to each game phase.

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
- [Game Modes](#game-modes)
- [AI Difficulty Tiers](#ai-difficulty-tiers)
- [Scoring System](#scoring-system)
- [Audio System](#audio-system)
- [Music Credits](#music-credits)
- [Scripts Reference](#scripts-reference)

---

## Features

- **Solo vs AI** — four difficulty tiers with distinct targeting strategies
- **Local PvP** — hot-seat two-player mode with handoff screens to keep boards hidden
- **Full fleet placement** — manual cell-by-cell placement or one-click randomise; toggle orientation with keyboard
- **Real-time combat log** — hit, miss, sunk, and system entries with timestamps
- **Post-game debrief** — rank (Private → General of the Armies), score, and contextual commentary
- **Session statistics** — wins, losses, win rate, average shots, accuracy, and streaks; tracked separately for Solo and each PvP player across the session without reloading
- **Board review** — inspect both fleets after any game ends before returning to the menu
- **Hybrid audio system** — synthesised Web Audio API effects (zero asset overhead) and phase-matched MP3 background music; per-channel volume sliders and global mute persist across sessions via `localStorage`
- **Audio gate** — one-time click-to-enable screen satisfies browser autoplay policy; skipped automatically on return visits
- **Keyboard navigation** — fully playable without a mouse throughout all screens
- **Military-terminal aesthetic** — scanline overlay, Orbitron display font, amber/steel palette

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| UI         | React 19, TypeScript 5.9            |
| Build      | Vite 6                              |
| Styling    | Plain CSS (CSS custom properties)   |
| Audio      | Web Audio API + HTML `<audio>` MP3  |
| Testing    | Jest 30, ts-jest, Testing Library   |
| Fonts      | Orbitron, Share Tech Mono (Google)  |

---

## Project Structure

```
battleship/
├── src/
│   ├── __mocks__/
│   │   └── audioMock.js             # Jest stub for .mp3 imports
│   ├── __tests__/                   # 27 test files, 1 245 tests
│   ├── ai/
│   │   └── opponent.ts              # All four AI strategies + multi-ship hit tracking
│   ├── assets/
│   │   └── audio/
│   │       ├── music-battle.mp3
│   │       ├── music-defeat.mp3
│   │       ├── music-menu.mp3
│   │       ├── music-setup.mp3
│   │       └── music-victory.mp3
│   ├── audio/
│   │   └── effects.ts               # Web Audio synthesis — 10 sound effects
│   ├── components/
│   │   ├── AudioControls.tsx        # Fixed-position mute + dual volume sliders
│   │   ├── AudioGateScreen.tsx      # One-time autoplay-unlock screen
│   │   ├── BoardGrid.tsx
│   │   ├── Cell.tsx
│   │   ├── CombatLog.tsx
│   │   ├── DifficultySelect.tsx
│   │   ├── FleetRoster.tsx
│   │   ├── GameOver.tsx
│   │   ├── GameScreen.tsx
│   │   ├── Mainmenu.tsx
│   │   ├── PvPGameOver.tsx
│   │   ├── PvPHandoffScreen.tsx     # Blind handoff between PvP turns
│   │   └── SetupScreen.tsx
│   ├── hooks/
│   │   ├── useGameState.ts          # Solo game state + AI timer management
│   │   ├── usePvPGameState.ts       # PvP game state for both players
│   │   ├── useSessionStats.ts       # Cross-game session statistics
│   │   └── useSoundManager.ts       # Master audio hook — music fades + effects
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
│   │   └── scoring.ts               # Score formula, ranks, commentary text
│   ├── App.tsx                      # Top-level router + all sound wiring
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── jest.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
├── Netlify.toml
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

Vite starts a dev server at **http://localhost:3000** and opens your browser automatically. Hot module replacement is enabled — edits to any source file reflect instantly.

### Running Tests

```bash
# Run the full test suite (1 245 tests across 27 files)
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

The repo ships with a `Netlify.toml` that configures the build command and publish directory automatically. Connect the repository in the Netlify dashboard and deploy with zero additional configuration.

---

## Game Modes

### Solo vs AI

Select a difficulty, place your fleet (or randomise), then fire at the enemy grid. The AI responds immediately after each of your shots. The game ends when all ships on either side are sunk. A post-game debrief shows your score, rank, and commentary based on shot efficiency.

### Local PvP

Two players share one device in hot-seat fashion:

1. **Player 1 fleet deployment** — place ships, then confirm.
2. **Handoff screen** — a blind screen prompts Player 2 to take the device.
3. **Player 2 fleet deployment** — place ships, then confirm.
4. **Second handoff** — announces which player fires first.
5. **Battle** — players alternate turns; a handoff screen between each turn prevents board peeking.
6. **Game over** — winner announced with per-player shot and accuracy stats. Both boards can be reviewed before returning to the menu.

---

## AI Difficulty Tiers

| Tier   | Codename           | Strategy                                                              |
|--------|--------------------|-----------------------------------------------------------------------|
| Easy   | RANDOM FIRE        | Pure random fire. Never enters target mode after a hit.              |
| Medium | CHECKERBOARD SWEEP | Parity-pattern hunt with basic hunt-and-target follow-up.            |
| Hard   | DENSITY HUNT       | Density-weighted probability map biased toward the largest remaining ship. |
| Sweaty | OPTIMAL STRIKE     | Full probability density across all remaining ships. Near-optimal.   |

Medium, Hard, and Sweaty share a multi-ship tracking system: confirmed hits are never abandoned even when an adjacent vessel is sunk, preventing the AI from losing track of a second ship it has already struck.

---

## Scoring System

Scoring applies to **Solo vs AI wins only** — AI attacks and PvP games use separate accuracy tracking.

```
score = floor( 24 × 100 × difficulty_multiplier / player_shots_fired )
        clamped to [0, 100]
```

The baseline of 24 represents a strong human performance (17 ship cells + 7 search shots above the mathematical minimum). A perfect 100 requires hitting that threshold exactly for the given difficulty.

**Difficulty multipliers**

| Difficulty | Multiplier | Shots for General |
|------------|------------|-------------------|
| Easy       | ×1.00      | ≤ 24              |
| Medium     | ×1.15      | ≤ 27              |
| Hard       | ×1.30      | ≤ 31              |
| Sweaty     | ×1.50      | ≤ 36              |

**Rank thresholds**

| Score   | Rank                  |
|---------|-----------------------|
| 100     | General of the Armies |
| 90–99   | Admiral               |
| 69–89   | Captain               |
| 36–68   | Sergeant              |
| 0–35    | Private               |

---

## Audio System

All audio is controlled by the fixed-position `AudioControls` panel (top-right corner of every screen), which provides separate music and effects volume sliders plus a global mute toggle. Settings persist to `localStorage` across browser sessions.

### Music

Five MP3 tracks are cross-faded (500 ms) on phase transitions:

| Phase                          | Track          | Loops |
|--------------------------------|----------------|-------|
| Menu                           | `music-menu`   | Yes   |
| Fleet deployment (any mode)    | `music-setup`  | Yes   |
| Battle (any mode)              | `music-battle` | Yes   |
| Solo game won                  | `music-victory`| Once  |
| Solo game lost                 | `music-defeat` | Once  |
| PvP game over                  | `music-victory`| Once  |

### Sound Effects

Ten effects are synthesised on demand via the Web Audio API — no audio files are downloaded for effects:

| Effect          | Trigger                             |
|-----------------|-------------------------------------|
| `hit`           | Successful shot on enemy ship       |
| `miss`          | Shot lands in open water            |
| `sunk`          | Enemy ship fully sunk               |
| `shipPlace`     | Ship placed on the grid             |
| `shipClear`     | Fleet cleared from the board        |
| `randomize`     | Randomise placement button          |
| `uiClick`       | Difficulty selection button         |
| `handoffAdvance`| Key press to advance handoff screen |
| `aiThinking`    | AI targeting indicator activates    |
| `aiFires`       | AI fires its shot                   |

### Browser Autoplay

On first visit, an **Audio Gate** screen requires a click before any audio plays, satisfying browser autoplay policy. Subsequent visits skip the gate automatically via `localStorage`.

---

## Music Credits

Music by Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
https://creativecommons.org/licenses/by/4.0/

| Track | Used for |
|---|---|
| "Hitman" | Main Menu |
| "Investigations" | Fleet Deployment |
| "Five Armies" | Battle |
| "Fanfare for Space" | Victory |
| "Anguish" | Defeat |

---

## Scripts Reference

| Script               | Description                             |
|----------------------|-----------------------------------------|
| `npm run dev`        | Start Vite dev server at localhost:3000 |
| `npm run build`      | Type-check + production build → dist/  |
| `npm run preview`    | Serve the production build locally      |
| `npm run typecheck`  | TypeScript type-check only (no emit)    |
| `npm test`           | Run the full Jest test suite            |
| `npm run test:watch` | Jest in watch mode                      |
