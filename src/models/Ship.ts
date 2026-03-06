import { Ship } from './types';

// Creates a new Ship object with no cells placed yet.
// ID is derived from the ship name since names are unique within a fleet,
// eliminating the need for a mutable module-level counter.
export function createShip(name: string, size: number): Ship {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    size,
    cells: [],
    hits: new Set<string>(),
    sunk: false,
  };
}

// Records a hit on a ship cell and checks if it's now sunk
export function hitShip(ship: Ship, row: number, col: number): Ship {
  const key         = `${row},${col}`;
  const updatedHits = new Set(ship.hits);
  updatedHits.add(key);

  return {
    ...ship,
    hits: updatedHits,
    sunk: updatedHits.size === ship.size,
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