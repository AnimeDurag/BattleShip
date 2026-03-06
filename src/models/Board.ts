import { Board, Ship, Orientation, AttackOutcome, CellState } from './types';
import { hitShip, shipOccupiesCell } from './Ship';
import { BOARD_SIZE } from '../utils/constants';

// Creates a fresh empty 10x10 board
export function createBoard(): Board {
  return {
    grid: Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill('empty') as CellState[]),
    ships: [],
  };
}

// Calculates all cells a ship would occupy given a start position and orientation
export function getShipCells(
  ship: Ship,
  row: number,
  col: number,
  orientation: Orientation
): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i < ship.size; i++) {
    if (orientation === 'horizontal') {
      cells.push([row, col + i]);
    } else {
      cells.push([row + i, col]);
    }
  }
  return cells;
}

// Returns true if all cells are within board bounds
function inBounds(cells: [number, number][]): boolean {
  return cells.every(
    ([r, c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE
  );
}

// Returns true if none of the cells overlap an existing ship
function noCollision(board: Board, cells: [number, number][]): boolean {
  return cells.every(([r, c]) => board.grid[r][c] === 'empty');
}

// Places a ship on the board — returns updated board or null if placement invalid
export function placeShip(
  board: Board,
  ship: Ship,
  row: number,
  col: number,
  orientation: Orientation
): Board | null {
  const cells = getShipCells(ship, row, col, orientation);

  if (!inBounds(cells) || !noCollision(board, cells)) {
    return null;
  }

  const newGrid = board.grid.map(r => [...r]) as CellState[][];
  cells.forEach(([r, c]) => {
    newGrid[r][c] = 'ship';
  });

  const placedShip: Ship = { ...ship, cells };

  return {
    grid: newGrid,
    ships: [...board.ships, placedShip],
  };
}

// Processes an attack on a board — returns updated board and outcome
export function receiveAttack(
  board: Board,
  row: number,
  col: number
): { board: Board; outcome: AttackOutcome } {
  const currentCell = board.grid[row][col];

  // Prevent attacking the same cell twice
  if (currentCell === 'hit' || currentCell === 'miss' || currentCell === 'sunk') {
    return { board, outcome: { result: 'already-attacked' } };
  }

  const newGrid = board.grid.map(r => [...r]) as CellState[][];

  // Check if any ship occupies this cell
  const targetShipIndex = board.ships.findIndex(ship =>
    shipOccupiesCell(ship, row, col)
  );

  if (targetShipIndex === -1) {
    // Miss
    newGrid[row][col] = 'miss';
    return {
      board: { ...board, grid: newGrid },
      outcome: { result: 'miss' },
    };
  }

  // Hit — update the ship
  const updatedShip = hitShip(board.ships[targetShipIndex], row, col);
  const updatedShips = [...board.ships];
  updatedShips[targetShipIndex] = updatedShip;

  if (updatedShip.sunk) {
    // Mark all cells of the sunk ship
    updatedShip.cells.forEach(([r, c]) => {
      newGrid[r][c] = 'sunk';
    });
    return {
      board: { grid: newGrid, ships: updatedShips },
      outcome: { result: 'sunk', ship: updatedShip },
    };
  }

  // Regular hit
  newGrid[row][col] = 'hit';
  return {
    board: { grid: newGrid, ships: updatedShips },
    outcome: { result: 'hit', ship: updatedShip },
  };
}

// Returns true if every ship on the board has been sunk
export function allShipsSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every(ship => ship.sunk);
}