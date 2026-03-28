import { parseCoordinate, formatCoordinate, randomInt, randomOrientation, randomBoard, cx } from '../utils/helpers';
import { createBoard, placeShip } from '../models/Board';
import { createShip } from '../models/Ship';
import { FLEET, BOARD_SIZE } from '../utils/constants';

// ─── parseCoordinate ──────────────────────────────────────────────────────────

describe('parseCoordinate', () => {
  it('parses a standard coordinate correctly', () => {
    expect(parseCoordinate('A1')).toEqual([0, 0]);
    expect(parseCoordinate('J10')).toEqual([9, 9]);
  });

  it('parses lowercase input', () => {
    expect(parseCoordinate('a1')).toEqual([0, 0]);
    expect(parseCoordinate('j10')).toEqual([9, 9]);
  });

  it('parses mixed case input', () => {
    expect(parseCoordinate('B5')).toEqual([4, 1]);
  });

  it('handles leading and trailing whitespace', () => {
    expect(parseCoordinate('  C3  ')).toEqual([2, 2]);
  });

  it('parses mid-board coordinates correctly', () => {
    expect(parseCoordinate('E5')).toEqual([4, 4]);
    expect(parseCoordinate('F7')).toEqual([6, 5]);
  });

  it('parses boundary coordinates', () => {
    expect(parseCoordinate('A1')).toEqual([0, 0]);   // top-left
    expect(parseCoordinate('J1')).toEqual([0, 9]);   // top-right
    expect(parseCoordinate('A10')).toEqual([9, 0]);  // bottom-left
    expect(parseCoordinate('J10')).toEqual([9, 9]);  // bottom-right
  });

  it('returns null for an invalid column letter', () => {
    expect(parseCoordinate('K1')).toBeNull();
    expect(parseCoordinate('Z5')).toBeNull();
  });

  it('returns null for a row number below 1', () => {
    expect(parseCoordinate('A0')).toBeNull();
  });

  it('returns null for a row number above 10', () => {
    expect(parseCoordinate('A11')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseCoordinate('')).toBeNull();
  });

  it('returns null for a number-only string', () => {
    expect(parseCoordinate('55')).toBeNull();
  });

  it('returns null for a letter-only string', () => {
    expect(parseCoordinate('AA')).toBeNull();
  });

  it('returns null for a coordinate with no number', () => {
    expect(parseCoordinate('A')).toBeNull();
  });

  it('returns null for special character input', () => {
    expect(parseCoordinate('!5')).toBeNull();
  });
});

// ─── formatCoordinate ─────────────────────────────────────────────────────────

describe('formatCoordinate', () => {
  it('formats origin [0,0] as A1', () => {
    expect(formatCoordinate(0, 0)).toBe('A1');
  });

  it('formats bottom-right corner [9,9] as J10', () => {
    expect(formatCoordinate(9, 9)).toBe('J10');
  });

  it('formats mid-board coordinates', () => {
    expect(formatCoordinate(4, 4)).toBe('E5');
    expect(formatCoordinate(6, 5)).toBe('F7');
  });

  it('is the inverse of parseCoordinate for all boundary values', () => {
    const cases: [number, number][] = [[0,0],[0,9],[9,0],[9,9],[4,4]];
    cases.forEach(([r, c]) => {
      const formatted = formatCoordinate(r, c);
      expect(parseCoordinate(formatted)).toEqual([r, c]);
    });
  });
});

// ─── randomInt ────────────────────────────────────────────────────────────────

describe('randomInt', () => {
  it('always returns a non-negative integer', () => {
    for (let i = 0; i < 100; i++) {
      const n = randomInt(10);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('always returns a value strictly less than max', () => {
    for (let i = 0; i < 100; i++) {
      expect(randomInt(10)).toBeLessThan(10);
    }
  });

  it('returns 0 when max is 1', () => {
    for (let i = 0; i < 20; i++) {
      expect(randomInt(1)).toBe(0);
    }
  });

  it('covers the full range [0, max) over many iterations', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) seen.add(randomInt(BOARD_SIZE));
    for (let n = 0; n < BOARD_SIZE; n++) expect(seen.has(n)).toBe(true);
  });
});

// ─── randomOrientation ────────────────────────────────────────────────────────

describe('randomOrientation', () => {
  it('only returns horizontal or vertical', () => {
    for (let i = 0; i < 50; i++) {
      const o = randomOrientation();
      expect(['horizontal', 'vertical']).toContain(o);
    }
  });

  it('produces both orientations over many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(randomOrientation());
    expect(seen.has('horizontal')).toBe(true);
    expect(seen.has('vertical')).toBe(true);
  });
});

// ─── randomBoard ──────────────────────────────────────────────────────────────

describe('randomBoard', () => {
  it('places all five fleet ships when called with no arguments', () => {
    const board = randomBoard();
    expect(board.ships).toHaveLength(FLEET.length);
  });

  it('places every ship in the fleet exactly once', () => {
    const board = randomBoard();
    const names = board.ships.map(s => s.name).sort();
    expect(names).toEqual(FLEET.map(f => f.name).sort());
  });

  it('places each ship with the correct size', () => {
    const board = randomBoard();
    FLEET.forEach(def => {
      const ship = board.ships.find(s => s.name === def.name)!;
      expect(ship.size).toBe(def.size);
      expect(ship.cells).toHaveLength(def.size);
    });
  });

  it('all ships are within board bounds', () => {
    const board = randomBoard();
    board.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(BOARD_SIZE);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(BOARD_SIZE);
      });
    });
  });

  it('no two ships overlap on the grid', () => {
    const board    = randomBoard();
    const shipCells = new Set<string>();
    board.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        expect(shipCells.has(key)).toBe(false);
        shipCells.add(key);
      });
    });
  });

  it('grid cells match the placed ships — ship cells marked as ship', () => {
    const board = randomBoard();
    board.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        expect(board.grid[r][c]).toBe('ship');
      });
    });
  });

  it('grid has no ship cells outside placed ship positions', () => {
    const board     = randomBoard();
    const shipCells = new Set(board.ships.flatMap(s => s.cells.map(([r,c]) => `${r},${c}`)));
    board.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!shipCells.has(`${r},${c}`)) {
          expect(cell).toBe('empty');
        }
      });
    });
  });

  it('excludes named ships when excludeNames is provided', () => {
    const board = randomBoard(undefined, ['Carrier', 'Battleship']);
    const names = board.ships.map(s => s.name);
    expect(names).not.toContain('Carrier');
    expect(names).not.toContain('Battleship');
    expect(names).toContain('Cruiser');
    expect(names).toContain('Submarine');
    expect(names).toContain('Destroyer');
  });

  it('places excluded ships onto an existing board that already has them', () => {
    // Manually place Carrier, then randomBoard should add the rest
    let board = createBoard();
    board     = placeShip(board, createShip('Carrier', 5), 0, 0, 'horizontal')!;
    const completed = randomBoard(board, ['Carrier']);
    expect(completed.ships).toHaveLength(FLEET.length);
  });

  it('returns an unmodified board when all ships are excluded', () => {
    const allNames = FLEET.map(f => f.name);
    const board    = randomBoard(undefined, allNames);
    expect(board.ships).toHaveLength(0);
  });

  it('produces different layouts across multiple calls (statistical)', () => {
    const layout1 = randomBoard().ships.map(s => s.cells[0].join(',')).join('|');
    const layout2 = randomBoard().ships.map(s => s.cells[0].join(',')).join('|');
    const layout3 = randomBoard().ships.map(s => s.cells[0].join(',')).join('|');
    // Astronomically unlikely all three are identical unless RNG is broken
    const allSame = layout1 === layout2 && layout2 === layout3;
    expect(allSame).toBe(false);
  });

  it('throws when the board is too full to place a remaining ship', () => {
    // Fill every cell of the board except a 1x1 gap, then try to place a size-2
    // ship — it cannot fit anywhere, so the attempt guard must fire.
    let board = createBoard();
    // Pack the board with size-1 ships covering all but the last cell
    // Simpler approach: mock placeShip to always return null via a pathological board.
    // We construct this by filling the grid manually and bypassing placeShip.
    const fullGrid = board.grid.map(row => row.map(() => 'ship' as const));
    const fullBoard = { grid: fullGrid, ships: [] };

    // randomBoard with a full grid and a ship to place should throw
    expect(() => randomBoard(fullBoard, ['Carrier', 'Battleship', 'Cruiser', 'Submarine']))
      .toThrow(/Failed to place Destroyer after 500 attempts/);
  });

  it('does not mutate the existingBoard passed in', () => {
    const original = createBoard();
    randomBoard(original);
    expect(original.ships).toHaveLength(0);
    original.grid.forEach(row => row.forEach(cell => expect(cell).toBe('empty')));
  });
});

// ─── cx ───────────────────────────────────────────────────────────────────────

describe('cx', () => {
  it('joins multiple string arguments with a space', () => {
    expect(cx('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('returns a single class unchanged', () => {
    expect(cx('only')).toBe('only');
  });

  it('filters out false', () => {
    expect(cx('a', false, 'b')).toBe('a b');
  });

  it('filters out null', () => {
    expect(cx('a', null, 'b')).toBe('a b');
  });

  it('filters out undefined', () => {
    expect(cx('a', undefined, 'b')).toBe('a b');
  });

  it('filters out empty string (falsy)', () => {
    expect(cx('a', '', 'b')).toBe('a b');
  });

  it('returns empty string when all arguments are falsy', () => {
    expect(cx(false, null, undefined, '')).toBe('');
  });

  it('returns empty string with no arguments', () => {
    expect(cx()).toBe('');
  });

  it('handles a conditional modifier — true branch', () => {
    const active = true;
    expect(cx('btn', active && 'btn--active')).toBe('btn btn--active');
  });

  it('handles a conditional modifier — false branch (no trailing space)', () => {
    const active = false;
    expect(cx('btn', active && 'btn--active')).toBe('btn');
  });

  it('replicates the ship-selector class pattern exactly', () => {
    const selected = true;
    const placed   = false;
    expect(cx(
      'ship-selector__item',
      selected && 'ship-selector__item--selected',
      placed   && 'ship-selector__item--placed',
    )).toBe('ship-selector__item ship-selector__item--selected');
  });

  it('replicates orientation-toggle active pattern — horizontal', () => {
    const orientation = 'horizontal';
    expect(cx('orientation-toggle__btn', orientation === 'horizontal' && 'orientation-toggle__btn--active'))
      .toBe('orientation-toggle__btn orientation-toggle__btn--active');
  });

});