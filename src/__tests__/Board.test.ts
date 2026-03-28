import { createBoard, placeShip, receiveAttack, allShipsSunk, getShipCells } from '../models/Board';
import { createShip } from '../models/Ship';
import { BOARD_SIZE } from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function boardWithShip(row: number, col: number, size: number, orientation: 'horizontal' | 'vertical' = 'horizontal') {
  const board = createBoard();
  const ship  = createShip('Destroyer', size);
  return placeShip(board, ship, row, col, orientation)!;
}

// ─── createBoard ──────────────────────────────────────────────────────────────

describe('createBoard', () => {
  it('creates a 10x10 grid of empty cells', () => {
    const board = createBoard();
    expect(board.grid).toHaveLength(BOARD_SIZE);
    board.grid.forEach(row => {
      expect(row).toHaveLength(BOARD_SIZE);
      row.forEach(cell => expect(cell).toBe('empty'));
    });
  });

  it('starts with no ships', () => {
    expect(createBoard().ships).toHaveLength(0);
  });

  it('each call returns an independent board (no shared references)', () => {
    const a = createBoard();
    const b = createBoard();
    a.grid[0][0] = 'hit';
    expect(b.grid[0][0]).toBe('empty');
  });
});

// ─── getShipCells ─────────────────────────────────────────────────────────────

describe('getShipCells', () => {
  it('returns correct horizontal cells from origin', () => {
    const ship  = createShip('Cruiser', 3);
    const cells = getShipCells(ship, 0, 0, 'horizontal');
    expect(cells).toEqual([[0,0],[0,1],[0,2]]);
  });

  it('returns correct vertical cells from origin', () => {
    const ship  = createShip('Cruiser', 3);
    const cells = getShipCells(ship, 0, 0, 'vertical');
    expect(cells).toEqual([[0,0],[1,0],[2,0]]);
  });

  it('returns correct cells starting mid-board', () => {
    const ship  = createShip('Destroyer', 2);
    const cells = getShipCells(ship, 4, 5, 'horizontal');
    expect(cells).toEqual([[4,5],[4,6]]);
  });

  it('returns a single cell for size-1 ship', () => {
    const ship  = createShip('Patrol', 1);
    const cells = getShipCells(ship, 7, 3, 'vertical');
    expect(cells).toEqual([[7,3]]);
  });
});

// ─── placeShip ────────────────────────────────────────────────────────────────

describe('placeShip', () => {
  it('places a ship horizontally and marks cells as ship', () => {
    const result = boardWithShip(0, 0, 2, 'horizontal');
    expect(result.grid[0][0]).toBe('ship');
    expect(result.grid[0][1]).toBe('ship');
  });

  it('places a ship vertically and marks cells as ship', () => {
    const result = boardWithShip(0, 0, 2, 'vertical');
    expect(result.grid[0][0]).toBe('ship');
    expect(result.grid[1][0]).toBe('ship');
  });

  it('adds the ship to the ships array with correct cells', () => {
    const result = boardWithShip(2, 3, 3, 'horizontal');
    expect(result.ships).toHaveLength(1);
    expect(result.ships[0].cells).toEqual([[2,3],[2,4],[2,5]]);
  });

  it('does not mutate the original board', () => {
    const original = createBoard();
    const ship     = createShip('Destroyer', 2);
    placeShip(original, ship, 0, 0, 'horizontal');
    expect(original.grid[0][0]).toBe('empty');
    expect(original.ships).toHaveLength(0);
  });

  it('returns null when ship extends off the right edge (horizontal)', () => {
    const board  = createBoard();
    const ship   = createShip('Carrier', 5);
    expect(placeShip(board, ship, 0, 8, 'horizontal')).toBeNull(); // cols 8-12
  });

  it('returns null when ship extends off the bottom edge (vertical)', () => {
    const board  = createBoard();
    const ship   = createShip('Carrier', 5);
    expect(placeShip(board, ship, 8, 0, 'vertical')).toBeNull(); // rows 8-12
  });

  it('returns null when ship starts at the exact last valid column then overflows', () => {
    const board = createBoard();
    const ship  = createShip('Destroyer', 2);
    expect(placeShip(board, ship, 0, 9, 'horizontal')).toBeNull(); // cols 9-10
  });

  it('allows placement at the last valid position horizontally', () => {
    const board  = createBoard();
    const ship   = createShip('Destroyer', 2);
    expect(placeShip(board, ship, 0, 8, 'horizontal')).not.toBeNull(); // cols 8-9
  });

  it('allows placement at the last valid position vertically', () => {
    const board  = createBoard();
    const ship   = createShip('Destroyer', 2);
    expect(placeShip(board, ship, 8, 0, 'vertical')).not.toBeNull(); // rows 8-9
  });

  it('returns null when ships overlap (horizontal)', () => {
    let board  = createBoard();
    const s1   = createShip('Destroyer', 2);
    const s2   = createShip('Cruiser',   3);
    board = placeShip(board, s1, 0, 0, 'horizontal')!;
    expect(placeShip(board, s2, 0, 0, 'horizontal')).toBeNull();
  });

  it('returns null when ships overlap (cross pattern)', () => {
    let board = createBoard();
    const s1  = createShip('Destroyer', 2);
    const s2  = createShip('Cruiser',   3);
    board = placeShip(board, s1, 2, 0, 'horizontal')!;
    expect(placeShip(board, s2, 0, 1, 'vertical')).toBeNull(); // s2 col 1 row 2 hits s1
  });

  it('allows placing multiple non-overlapping ships', () => {
    let board = createBoard();
    board = placeShip(board, createShip('Destroyer',  2), 0, 0, 'horizontal')!;
    board = placeShip(board, createShip('Cruiser',    3), 2, 0, 'horizontal')!;
    board = placeShip(board, createShip('Battleship', 4), 4, 0, 'horizontal')!;
    expect(board.ships).toHaveLength(3);
  });

  it('allows placement at the bottom-right corner for a size-1 ship', () => {
    const board  = createBoard();
    const ship   = createShip('Patrol', 1);
    const result = placeShip(board, ship, 9, 9, 'horizontal');
    expect(result).not.toBeNull();
    expect(result!.grid[9][9]).toBe('ship');
  });
});

// ─── receiveAttack ────────────────────────────────────────────────────────────

describe('receiveAttack', () => {
  it('records a miss on an empty cell', () => {
    const { board, outcome } = receiveAttack(createBoard(), 5, 5);
    expect(outcome.result).toBe('miss');
    expect(board.grid[5][5]).toBe('miss');
  });

  it('records a hit on a ship cell', () => {
    const board              = boardWithShip(0, 0, 2, 'horizontal');
    const { board: b, outcome } = receiveAttack(board, 0, 0);
    expect(outcome.result).toBe('hit');
    expect(b.grid[0][0]).toBe('hit');
    // Narrow the union before accessing ship
    if (outcome.result === 'hit' || outcome.result === 'sunk') {
      expect(outcome.ship).toBeDefined();
    } else {
      fail('Expected outcome.result to be hit');
    }
  });

  it('marks all cells of a sunk ship as sunk', () => {
    let board = boardWithShip(0, 0, 2, 'horizontal');
    let res   = receiveAttack(board, 0, 0);
    res       = receiveAttack(res.board, 0, 1);
    expect(res.outcome.result).toBe('sunk');
    expect(res.board.grid[0][0]).toBe('sunk');
    expect(res.board.grid[0][1]).toBe('sunk');
  });

  it('returns already-attacked when hitting a miss cell', () => {
    let board = createBoard();
    board     = receiveAttack(board, 3, 3).board;
    const { outcome } = receiveAttack(board, 3, 3);
    expect(outcome.result).toBe('already-attacked');
  });

  it('returns already-attacked when hitting a hit cell', () => {
    let board = boardWithShip(0, 0, 2, 'horizontal');
    board     = receiveAttack(board, 0, 0).board;
    const { outcome } = receiveAttack(board, 0, 0);
    expect(outcome.result).toBe('already-attacked');
  });

  it('returns already-attacked when hitting a sunk cell', () => {
    let board = boardWithShip(0, 0, 1, 'horizontal');
    board     = receiveAttack(board, 0, 0).board; // sinks it
    const { outcome } = receiveAttack(board, 0, 0);
    expect(outcome.result).toBe('already-attacked');
  });

  it('does not mutate the original board', () => {
    const original = boardWithShip(1, 1, 2, 'horizontal');
    receiveAttack(original, 1, 1);
    expect(original.grid[1][1]).toBe('ship');
  });

  it('outcome.ship is undefined on a miss', () => {
    const { outcome } = receiveAttack(createBoard(), 0, 0);
    // The discriminated union omits ship on miss/already-attacked branches
    expect('ship' in outcome).toBe(false);
  });

  it('outcome.ship is populated and correct on a hit', () => {
    const board        = boardWithShip(3, 3, 3, 'horizontal');
    const { outcome }  = receiveAttack(board, 3, 3);
    expect(outcome.result).toBe('hit');
    if (outcome.result === 'hit' || outcome.result === 'sunk') {
      expect(outcome.ship).toBeDefined();
      expect(outcome.ship.name).toBe('Destroyer');
    }
  });

  it('outcome.ship is populated on a sunk', () => {
    let board = boardWithShip(0, 0, 1);
    const { outcome } = receiveAttack(board, 0, 0);
    expect(outcome.result).toBe('sunk');
    if (outcome.result === 'hit' || outcome.result === 'sunk') {
      expect(outcome.ship).toBeDefined();
    }
  });

  it('attacking adjacent cells does not affect unattacked ship cells', () => {
    const board        = boardWithShip(2, 2, 3, 'horizontal'); // cells: [2,2],[2,3],[2,4]
    const { board: b } = receiveAttack(board, 2, 2);
    expect(b.grid[2][3]).toBe('ship'); // neighbour unaffected
    expect(b.grid[2][4]).toBe('ship');
  });

  it('handles boundary attack at [0,0]', () => {
    const { board, outcome } = receiveAttack(createBoard(), 0, 0);
    expect(outcome.result).toBe('miss');
    expect(board.grid[0][0]).toBe('miss');
  });

  it('handles boundary attack at [9,9]', () => {
    const { board, outcome } = receiveAttack(createBoard(), 9, 9);
    expect(outcome.result).toBe('miss');
    expect(board.grid[9][9]).toBe('miss');
  });
});

// ─── allShipsSunk ─────────────────────────────────────────────────────────────

describe('allShipsSunk', () => {
  it('returns false for a board with no ships', () => {
    expect(allShipsSunk(createBoard())).toBe(false);
  });

  it('returns false when some ships remain afloat', () => {
    let board = createBoard();
    board = placeShip(board, createShip('Destroyer', 2), 0, 0, 'horizontal')!;
    board = placeShip(board, createShip('Cruiser',   3), 2, 0, 'horizontal')!;
    board = receiveAttack(board, 0, 0).board;
    board = receiveAttack(board, 0, 1).board; // Destroyer sunk
    expect(allShipsSunk(board)).toBe(false);  // Cruiser still afloat
  });

  it('returns true when every ship has been sunk', () => {
    let board = createBoard();
    board = placeShip(board, createShip('Destroyer', 2), 0, 0, 'horizontal')!;
    board = receiveAttack(board, 0, 0).board;
    board = receiveAttack(board, 0, 1).board;
    expect(allShipsSunk(board)).toBe(true);
  });

  it('returns true after sinking multiple ships', () => {
    let board = createBoard();
    board = placeShip(board, createShip('Destroyer', 2), 0, 0, 'horizontal')!;
    board = placeShip(board, createShip('Cruiser',   3), 2, 0, 'horizontal')!;
    [0,1].forEach(c => { board = receiveAttack(board, 0, c).board; });
    [0,1,2].forEach(c => { board = receiveAttack(board, 2, c).board; });
    expect(allShipsSunk(board)).toBe(true);
  });
});