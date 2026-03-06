import { Ship } from './types';

let shipCounter = 0;

// Creates a new Ship object with no cells placed yet
export function createShip(name: string, size: number): Ship {
  return {
    id: `ship_${++shipCounter}`,
    name,
    size,
    cells: [],
    hits: new Set<string>(),
    sunk: false,
  };
}

// Records a hit on a ship cell and checks if it's now sunk
export function hitShip(ship: Ship, row: number, col: number): Ship {
  const key = `${row},${col}`;
  const updatedHits = new Set(ship.hits);
  updatedHits.add(key);

  const sunk = updatedHits.size === ship.size;

  return {
    ...ship,
    hits: updatedHits,
    sunk,
  };
}

// Returns true if the ship occupies the given cell
export function shipOccupiesCell(
  ship: Ship,
  row: number,
  col: number
): boolean {
  return ship.cells.some(([r, c]) => r === row && c === col);
}