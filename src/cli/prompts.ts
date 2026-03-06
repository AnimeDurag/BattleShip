import * as readline from 'readline-sync';
import { Orientation } from '../models/types';
import { parseCoordinate } from '../utils/helpers';
import { BOARD_SIZE } from '../utils/constants';
import { COLUMN_LABELS } from '../utils/constants';

// Asks player to enter attack coordinates — loops until valid input
export function promptAttack(): [number, number] {
  while (true) {
    const input = readline.question('  Enter attack coordinate (e.g. A5): ');
    const coord = parseCoordinate(input);

    if (coord) {
      return coord;
    }

    console.log(
      `  Invalid coordinate. Use a letter (A–J) followed by a number (1–${BOARD_SIZE}). e.g. B7`
    );
  }
}

// Asks player to enter ship placement coordinates — loops until valid input
export function promptPlacement(shipName: string, shipSize: number): [number, number] {
  while (true) {
    const input = readline.question(
      `  Place your ${shipName} (size ${shipSize}) — enter start coordinate (e.g. A1): `
    );
    const coord = parseCoordinate(input);

    if (coord) {
      return coord;
    }

    console.log(
      `  Invalid coordinate. Use a letter (A–${COLUMN_LABELS[BOARD_SIZE - 1]}) followed by a number (1–${BOARD_SIZE}).`
    );
  }
}

// Asks player to choose ship orientation
export function promptOrientation(): Orientation {
  const choice = readline.keyInSelect(
    ['Horizontal', 'Vertical'],
    '  Choose orientation:',
    { cancel: false }
  );
  return choice === 0 ? 'horizontal' : 'vertical';
}

// Asks player if they want to randomize their ship placement
export function promptRandomPlacement(): boolean {
  return readline.keyInYNStrict('  Randomize ship placement?');
}

// Asks player if they want to play again
export function promptPlayAgain(): boolean {
  return readline.keyInYNStrict('\n  Play again?');
}

// Waits for the player to press any key before continuing
export function promptContinue(): void {
  readline.keyInPause('  Press any key to continue...');
}