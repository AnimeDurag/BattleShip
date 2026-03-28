export const BOARD_SIZE = 10;

export const FLEET = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 },
];

export const COLUMN_LABELS = ['A','B','C','D','E','F','G','H','I','J'];

// ─── Difficulty ───────────────────────────────────────────────────────────────

import type { Difficulty } from '../models/types';

// Human-readable display labels, keyed by Difficulty value.
// Used by the UI and the game-over screen — never hardcode these strings.
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy:   'EASY',
  medium: 'MEDIUM',
  hard:   'HARD',
  sweaty: 'SWEATY',
};

// The difficulty selected when the player has not explicitly chosen one.
export const DEFAULT_DIFFICULTY: Difficulty = 'medium';

// Ordered list for rendering a difficulty picker in the correct sequence.
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'sweaty'];

// ─── Ship identity ────────────────────────────────────────────────────────────
// Per-ship CSS custom-property names for color theming.
// Used by Cell, BoardGrid, SetupScreen, and FleetRoster to give each vessel
// a consistent visual identity across the board and the control panel.
export const SHIP_COLOR_VARS: Record<string, string> = {
  'Carrier':    '--ship-carrier',
  'Battleship': '--ship-battleship',
  'Cruiser':    '--ship-cruiser',
  'Submarine':  '--ship-submarine',
  'Destroyer':  '--ship-destroyer',
};