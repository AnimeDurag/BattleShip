import { BOARD_SIZE, COLUMN_LABELS } from './constants';

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