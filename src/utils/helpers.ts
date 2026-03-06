import { BOARD_SIZE, COLUMN_LABELS, FLEET } from './constants';
import { Board } from '../models/types';
import { createBoard, placeShip } from '../models/Board';
import { createShip } from '../models/Ship';

const MAX_PLACEMENT_ATTEMPTS = 500;

// Converts "A5" → [5, 0] (row, col)
export function parseCoordinate(input: string): [number, number] | null {
  const cleaned = input.trim().toUpperCase();
  const col = COLUMN_LABELS.indexOf(cleaned[0]);
  const row = parseInt(cleaned.slice(1), 10) - 1;

  if (col === -1 || isNaN(row) || row < 0 || row >= BOARD_SIZE) {
    return null;
  }
  return [row, col];
}

// Converts [5, 0] → "A6"
export function formatCoordinate(row: number, col: number): string {
  return `${COLUMN_LABELS[col]}${row + 1}`;
}

// Returns a random integer between 0 and max (exclusive)
export function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// Returns a random board orientation
export function randomOrientation(): 'horizontal' | 'vertical' {
  return Math.random() < 0.5 ? 'horizontal' : 'vertical';
}

// Places unplaced ships randomly onto an existing board.
// - If no board is provided a fresh empty board is created first.
// - If no excludeNames are provided the entire fleet is placed.
// Throws if a ship cannot be placed within MAX_PLACEMENT_ATTEMPTS,
// which guards against infinite loops on pathologically packed boards.
export function randomBoard(
  existingBoard?: Board,
  excludeNames: string[] = []
): Board {
  let board = existingBoard ?? createBoard();
  const shipsToPlace = FLEET.filter(f => !excludeNames.includes(f.name));

  for (const def of shipsToPlace) {
    const ship = createShip(def.name, def.size);
    let placed   = false;
    let attempts = 0;

    while (!placed) {
      if (attempts >= MAX_PLACEMENT_ATTEMPTS) {
        throw new Error(
          `Failed to place ${def.name} after ${MAX_PLACEMENT_ATTEMPTS} attempts. ` +
          `The board may be too full to fit remaining ships.`
        );
      }
      const row         = randomInt(BOARD_SIZE);
      const col         = randomInt(BOARD_SIZE);
      const orientation = randomOrientation();
      const result      = placeShip(board, ship, row, col, orientation);
      if (result) { board = result; placed = true; }
      attempts++;
    }
  }

  return board;
}