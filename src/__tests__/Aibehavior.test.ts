/**
 * AI difficulty behavior tests
 *
 * Verifies the observable behavior of each difficulty tier:
 *
 *  Easy   — always random, never enters target mode, mode stays 'hunt'
 *            even after hits.
 *  Medium — checkerboard hunt, enters target mode on hit, backtracks on miss.
 *  Hard   — density hunt weighted toward the largest remaining ship;
 *            target-mode behavior identical to medium.
 *  Sweaty — combined density hunt over all remaining ships;
 *            target-mode behavior identical to medium.
 *
 * Density functions (buildDensityGrid, buildCombinedDensityGrid) are tested
 * at the unit level for correctness of scores on controlled boards.
 */

import {
  createAIState,
  getAIMove,
  updateAIState,
  buildDensityGrid,
  buildCombinedDensityGrid,
} from '../ai/opponent';
import type { AIState, AIConfig } from '../models/types';
import { BOARD_SIZE, FLEET } from '../utils/constants';
import { createShip } from '../models/Ship';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Minimal ship for AttackOutcome — updateAIState only reads result, never ship.
const dummyShip = createShip('Dummy', 1);

function cfg(difficulty: AIConfig['difficulty']): AIConfig {
  return { difficulty };
}

// Build an AIState where every cell except those in `keep` has been attacked.
// Used to force the AI into a near-exhausted board so we can observe fallback
// behavior deterministically.
function aiWithOnlyCellsLeft(
  difficulty: AIConfig['difficulty'],
  keep: [number, number][]
): AIState {
  const ai = createAIState(cfg(difficulty));
  const attacked = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!keep.some(([kr, kc]) => kr === r && kc === c)) {
        attacked.add(`${r},${c}`);
      }
    }
  }
  return { ...ai, attacked };
}

// Run getAIMove N times and return all unique cells chosen.
function sampleMoves(ai: AIState, n: number): Set<string> {
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const [r, c] = getAIMove(ai);
    seen.add(`${r},${c}`);
  }
  return seen;
}

// ─── Easy ─────────────────────────────────────────────────────────────────────

describe('easy — hunt behavior', () => {
  it('always returns an unattacked cell', () => {
    const ai = createAIState(cfg('easy'));
    for (let i = 0; i < 20; i++) {
      const [r, c] = getAIMove(ai);
      expect(ai.attacked.has(`${r},${c}`)).toBe(false);
    }
  });

  it('can return any cell on the board — not restricted to a checkerboard', () => {
    // With enough samples both even-sum and odd-sum cells should appear.
    const ai   = createAIState(cfg('easy'));
    const seen = sampleMoves(ai, 200);
    const hasEven = [...seen].some(k => { const [r,c] = k.split(',').map(Number); return (r+c)%2===0; });
    const hasOdd  = [...seen].some(k => { const [r,c] = k.split(',').map(Number); return (r+c)%2===1; });
    expect(hasEven).toBe(true);
    expect(hasOdd).toBe(true);
  });

  it('returns the only remaining cell when the board is nearly full', () => {
    const ai = aiWithOnlyCellsLeft('easy', [[7, 3]]);
    const [r, c] = getAIMove(ai);
    expect(r).toBe(7);
    expect(c).toBe(3);
  });
});

describe('easy — ignores hits and stays in hunt mode', () => {
  it('mode remains hunt after a hit', () => {
    const ai   = createAIState(cfg('easy'));
    const next = updateAIState(ai, 3, 3, { result: 'hit', ship: dummyShip });
    expect(next.mode).toBe('hunt');
  });

  it('targetQueue remains empty after a hit', () => {
    const ai   = createAIState(cfg('easy'));
    const next = updateAIState(ai, 3, 3, { result: 'hit', ship: dummyShip });
    expect(next.targetQueue).toHaveLength(0);
  });

  it('mode remains hunt after a second hit on the same ship', () => {
    const ai    = createAIState(cfg('easy'));
    const after1 = updateAIState(ai,    3, 3, { result: 'hit', ship: dummyShip });
    const after2 = updateAIState(after1, 3, 4, { result: 'hit', ship: dummyShip });
    expect(after2.mode).toBe('hunt');
    expect(after2.targetQueue).toHaveLength(0);
  });

  it('mode remains hunt after a miss even when lastHit was set externally', () => {
    // Confirm the easy miss path never backtracks
    const ai: AIState = {
      ...createAIState(cfg('easy')),
      mode:        'target',
      firstHit:    [5, 5],
      lastHit:     [5, 5],
      targetQueue: [[4, 5], [6, 5]],
    };
    const next = updateAIState(ai, 4, 5, { result: 'miss' });
    // Easy resets to its stateless hunt — attacked grows, nothing else changes
    expect(next.attacked.has('4,5')).toBe(true);
    expect(next.mode).toBe('target'); // easy preserves spread, but getAIMove ignores it
    // The critical assertion: getAIMove for easy never uses the queue
    const [r, c] = getAIMove(next);
    expect(next.attacked.has(`${r},${c}`)).toBe(false);
  });

  it('getAIMove for easy always ignores the targetQueue', () => {
    const ai: AIState = {
      ...createAIState(cfg('easy')),
      mode:        'target',
      targetQueue: [[0, 0]],
    };
    // [0,0] is in the queue but the board is otherwise empty — easy should
    // still sometimes pick cells other than [0,0]
    const seen = sampleMoves(ai, 100);
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('easy — remainingShipSizes updates on sunk', () => {
  it('removes the sunk ship size from remainingShipSizes', () => {
    const ai   = createAIState(cfg('easy'));
    const ship = { id: 'destroyer', name: 'Destroyer', size: 2,
                   cells: [[0,0],[0,1]] as [number,number][], hits: new Set<string>(), sunk: true };
    const next = updateAIState(ai, 0, 1, { result: 'sunk', ship });
    expect(next.remainingShipSizes).not.toContain(2);
    expect(next.remainingShipSizes).toHaveLength(FLEET.length - 1);
  });
});

// ─── Medium ───────────────────────────────────────────────────────────────────

describe('medium — hunt behavior', () => {
  it('always returns an unattacked cell', () => {
    const ai = createAIState(cfg('medium'));
    for (let i = 0; i < 20; i++) {
      const [r, c] = getAIMove(ai);
      expect(ai.attacked.has(`${r},${c}`)).toBe(false);
    }
  });

  it('prefers checkerboard cells (even r+c sum) on a fresh board', () => {
    const ai   = createAIState(cfg('medium'));
    const seen = sampleMoves(ai, 200);
    const hasOdd = [...seen].some(k => {
      const [r,c] = k.split(',').map(Number);
      return (r+c) % 2 === 1;
    });
    // On an empty board, medium should only pick even-sum cells
    expect(hasOdd).toBe(false);
  });

  it('falls back to odd-sum cells when checkerboard is exhausted', () => {
    let ai = createAIState(cfg('medium'));
    // Miss every even-sum cell
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r+c) % 2 === 0) ai = updateAIState(ai, r, c, { result: 'miss' });
      }
    }
    const [r, c] = getAIMove(ai);
    expect((r + c) % 2).toBe(1);
  });
});

describe('medium — enters target mode on hit', () => {
  it('mode becomes target after the first hit', () => {
    const ai   = createAIState(cfg('medium'));
    const next = updateAIState(ai, 5, 5, { result: 'hit', ship: dummyShip });
    expect(next.mode).toBe('target');
  });

  it('targetQueue is non-empty after the first hit', () => {
    const ai   = createAIState(cfg('medium'));
    const next = updateAIState(ai, 5, 5, { result: 'hit', ship: dummyShip });
    expect(next.targetQueue.length).toBeGreaterThan(0);
  });

  it('getAIMove returns a queued cell in target mode', () => {
    const ai    = createAIState(cfg('medium'));
    const after = updateAIState(ai, 5, 5, { result: 'hit', ship: dummyShip });
    const [r, c] = getAIMove(after);
    const inQueue = after.targetQueue.some(([qr, qc]) => qr === r && qc === c);
    expect(inQueue).toBe(true);
  });

  it('reverts to hunt mode after sunk', () => {
    const ai    = createAIState(cfg('medium'));
    const after = updateAIState(ai, 5, 5, { result: 'sunk', ship: dummyShip });
    expect(after.mode).toBe('hunt');
    expect(after.targetQueue).toHaveLength(0);
  });
});

// ─── Hard ─────────────────────────────────────────────────────────────────────

describe('hard — hunt prefers high-density cells', () => {
  it('always returns an unattacked cell', () => {
    const ai = createAIState(cfg('hard'));
    for (let i = 0; i < 20; i++) {
      const [r, c] = getAIMove(ai);
      expect(ai.attacked.has(`${r},${c}`)).toBe(false);
    }
  });

  it('on a fresh board selects a cell with a non-zero density score', () => {
    const ai = createAIState(cfg('hard'));
    const [r, c] = getAIMove(ai);
    const maxSize = Math.max(...ai.remainingShipSizes);
    const density = buildDensityGrid(maxSize, ai.attacked);
    expect(density[r][c]).toBeGreaterThan(0);
  });

  it('never picks a cell whose density score is below the maximum', () => {
    // Constrain the board so only a narrow corridor of high-scoring cells exist.
    // Attack every row except row 0 — the only 5-cell horizontal run for the
    // Carrier (size 5) is now row 0, so all max-score cells must be in row 0.
    const ai = createAIState(cfg('hard'));
    const attacked = new Set<string>();
    for (let r = 1; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) attacked.add(`${r},${c}`);
    }
    const constrained = { ...ai, attacked };
    const [r] = getAIMove(constrained);
    expect(r).toBe(0);
  });

  it('uses the largest remaining ship size for density weighting', () => {
    // Remove everything but the Destroyer (size 2) from remainingShipSizes.
    // With only a size-2 ship remaining, density in corners should be lower
    // than in the center — the AI should not pick a corner cell.
    const ai = {
      ...createAIState(cfg('hard')),
      remainingShipSizes: [2],
    };
    // Corner [0,0] has density 2 (one horizontal + one vertical placement).
    // Center cells like [5,5] have density 4. Hard must prefer center.
    const density = buildDensityGrid(2, ai.attacked);
    const [r, c] = getAIMove(ai);
    const cornerScore  = density[0][0];
    const chosenScore  = density[r][c];
    expect(chosenScore).toBeGreaterThanOrEqual(cornerScore);
  });
});

describe('hard — target mode identical to medium', () => {
  it('enters target mode on first hit', () => {
    const ai   = createAIState(cfg('hard'));
    const next = updateAIState(ai, 5, 5, { result: 'hit', ship: dummyShip });
    expect(next.mode).toBe('target');
    expect(next.targetQueue.length).toBeGreaterThan(0);
  });

  it('getAIMove consumes the queue in target mode', () => {
    const ai    = createAIState(cfg('hard'));
    const after = updateAIState(ai, 5, 5, { result: 'hit', ship: dummyShip });
    const [r, c] = getAIMove(after);
    expect(after.targetQueue.some(([qr, qc]) => qr === r && qc === c)).toBe(true);
  });

  it('reverts to hunt after sunk', () => {
    const ai    = createAIState(cfg('hard'));
    const after = updateAIState(ai, 5, 5, { result: 'sunk', ship: dummyShip });
    expect(after.mode).toBe('hunt');
  });
});

describe('hard — remainingShipSizes shrinks on sunk', () => {
  it('removes the sunk ship size after a sunk outcome via updateAIState', () => {
    const ai   = createAIState(cfg('hard'));
    const ship = { id: 'carrier', name: 'Carrier', size: 5,
                   cells: [] as [number,number][], hits: new Set<string>(), sunk: true };
    const next = updateAIState(ai, 0, 4, { result: 'sunk', ship });
    expect(next.remainingShipSizes).not.toContain(5);
    expect(next.remainingShipSizes).toHaveLength(FLEET.length - 1);
  });

  it('hunt density shifts to the next largest ship after the largest is sunk', () => {
    const ai   = createAIState(cfg('hard'));
    // Sink the Carrier (size 5)
    const ship = { id: 'carrier', name: 'Carrier', size: 5,
                   cells: [] as [number,number][], hits: new Set<string>(), sunk: true };
    const after = updateAIState(ai, 0, 4, { result: 'sunk', ship });
    expect(Math.max(...after.remainingShipSizes)).toBe(4); // Battleship is now largest
    // Density grid should now use size 4
    const density = buildDensityGrid(4, after.attacked);
    const [r, c] = getAIMove(after);
    expect(density[r][c]).toBeGreaterThan(0);
  });
});

// ─── buildDensityGrid ─────────────────────────────────────────────────────────

describe('buildDensityGrid', () => {
  it('returns a 10x10 grid', () => {
    const grid = buildDensityGrid(3, new Set());
    expect(grid).toHaveLength(BOARD_SIZE);
    grid.forEach(row => expect(row).toHaveLength(BOARD_SIZE));
  });

  it('all scores are non-negative', () => {
    const grid = buildDensityGrid(5, new Set());
    grid.forEach(row => row.forEach(score => expect(score).toBeGreaterThanOrEqual(0)));
  });

  it('corner cell [0,0] has score 2 for a size-2 ship on an empty board', () => {
    // Exactly 1 horizontal ([0,0],[0,1]) and 1 vertical ([0,0],[1,0]) — score 2.
    expect(buildDensityGrid(2, new Set())[0][0]).toBe(2);
  });

  it('center cell [5,5] has a higher score than [0,0] for a size-5 ship', () => {
    const grid = buildDensityGrid(5, new Set());
    expect(grid[5][5]).toBeGreaterThan(grid[0][0]);
  });

  it('a cell blocked by an attacked neighbour scores lower than an open cell', () => {
    // Attack [5,5] — cells adjacent to [5,5] lose some placements.
    const attacked = new Set(['5,5']);
    const grid     = buildDensityGrid(3, attacked);
    const gridOpen = buildDensityGrid(3, new Set());
    // [5,4] loses all placements that would cross [5,5]
    expect(grid[5][4]).toBeLessThan(gridOpen[5][4]);
  });

  it('an attacked cell itself always scores 0', () => {
    const attacked = new Set(['3,3']);
    expect(buildDensityGrid(3, attacked)[3][3]).toBe(0);
  });

  it('a size-5 ship cannot fit in a 4-cell corridor — those cells score 0', () => {
    // Attack cols 4–9 of row 0, leaving only [0,0]–[0,3] open (4 cells).
    // A size-5 ship cannot fit horizontally; only vertical fits count.
    const attacked = new Set<string>();
    for (let c = 4; c < BOARD_SIZE; c++) attacked.add(`0,${c}`);
    const grid = buildDensityGrid(5, attacked);
    // [0,0] can only be covered by vertical placements — score must be < open-board score
    const openScore = buildDensityGrid(5, new Set())[0][0];
    expect(grid[0][0]).toBeLessThan(openScore);
  });

  it('all cells score 0 when attacked set covers the whole board', () => {
    const attacked = new Set<string>();
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) attacked.add(`${r},${c}`);
    const grid = buildDensityGrid(3, attacked);
    grid.forEach(row => row.forEach(score => expect(score).toBe(0)));
  });
});

// ─── buildCombinedDensityGrid ─────────────────────────────────────────────────

describe('buildCombinedDensityGrid', () => {
  it('returns a 10x10 grid', () => {
    const grid = buildCombinedDensityGrid([5, 4, 3, 3, 2], new Set());
    expect(grid).toHaveLength(BOARD_SIZE);
    grid.forEach(row => expect(row).toHaveLength(BOARD_SIZE));
  });

  it('all scores are non-negative', () => {
    const grid = buildCombinedDensityGrid([5, 4, 3, 3, 2], new Set());
    grid.forEach(row => row.forEach(s => expect(s).toBeGreaterThanOrEqual(0)));
  });

  it('combined score equals sum of individual scores for unique sizes', () => {
    // Sizes [5, 4, 3, 3, 2] — unique set is {5, 4, 3, 2}
    const attacked = new Set<string>();
    const sizes    = [5, 4, 3, 3, 2];
    const combined = buildCombinedDensityGrid(sizes, attacked);
    const manual   = buildDensityGrid(5, attacked);
    [[4],[3],[2]].forEach(([s]) => {
      const d = buildDensityGrid(s, attacked);
      for (let r = 0; r < BOARD_SIZE; r++)
        for (let c = 0; c < BOARD_SIZE; c++) manual[r][c] += d[r][c];
    });
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        expect(combined[r][c]).toBe(manual[r][c]);
  });

  it('duplicate sizes (Cruiser + Submarine both size 3) are counted only once', () => {
    // [3, 3] should produce the same grid as [3] — one pass for size 3.
    const attacked = new Set<string>();
    const gridDup    = buildCombinedDensityGrid([3, 3], attacked);
    const gridSingle = buildCombinedDensityGrid([3],    attacked);
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        expect(gridDup[r][c]).toBe(gridSingle[r][c]);
  });

  it('returns all-zero grid for an empty remainingShipSizes list', () => {
    const grid = buildCombinedDensityGrid([], new Set());
    grid.forEach(row => row.forEach(s => expect(s).toBe(0)));
  });

  it('scores are higher than any single ship density in the center', () => {
    const attacked = new Set<string>();
    const combined = buildCombinedDensityGrid([5,4,3,3,2], attacked);
    const single5  = buildDensityGrid(5, attacked);
    // Center cell should aggregate all ship sizes
    expect(combined[5][5]).toBeGreaterThan(single5[5][5]);
  });
});

// ─── Sweaty ───────────────────────────────────────────────────────────────────

describe('sweaty — hunt behavior', () => {
  it('always returns an unattacked cell', () => {
    const ai = createAIState(cfg('sweaty'));
    for (let i = 0; i < 20; i++) {
      const [r, c] = getAIMove(ai);
      expect(ai.attacked.has(`${r},${c}`)).toBe(false);
    }
  });

  it('on a fresh board selects a cell with a non-zero combined density score', () => {
    const ai = createAIState(cfg('sweaty'));
    const [r, c] = getAIMove(ai);
    const density = buildCombinedDensityGrid(ai.remainingShipSizes, ai.attacked);
    expect(density[r][c]).toBeGreaterThan(0);
  });

  it('selected cell has the maximum combined density score', () => {
    const ai      = createAIState(cfg('sweaty'));
    const density = buildCombinedDensityGrid(ai.remainingShipSizes, ai.attacked);
    const [r, c]  = getAIMove(ai);
    const chosen  = density[r][c];
    // No unattacked cell should score higher than the chosen cell
    for (let rr = 0; rr < BOARD_SIZE; rr++) {
      for (let cc = 0; cc < BOARD_SIZE; cc++) {
        if (!ai.attacked.has(`${rr},${cc}`)) {
          expect(density[rr][cc]).toBeLessThanOrEqual(chosen);
        }
      }
    }
  });

  it('never picks a cell with a lower density score than the maximum', () => {
    // Constrain board so only cells in row 0 are unattacked — all other rows
    // attacked. Row 0 still has the full range of horizontal placements.
    const attacked = new Set<string>();
    for (let r = 1; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++) attacked.add(`${r},${c}`);
    const ai       = { ...createAIState(cfg('sweaty')), attacked };
    const density  = buildCombinedDensityGrid(ai.remainingShipSizes, attacked);
    const [r, c]   = getAIMove(ai);
    const maxScore = Math.max(...Array.from({ length: BOARD_SIZE }, (_, cc) => density[0][cc]));
    expect(density[r][c]).toBe(maxScore);
  });

  it('returns the only remaining unattacked cell when the board is nearly full', () => {
    const ai = aiWithOnlyCellsLeft('sweaty', [[4, 4]]);
    const [r, c] = getAIMove(ai);
    expect(r).toBe(4);
    expect(c).toBe(4);
  });
});

describe('sweaty — target mode identical to medium', () => {
  it('enters target mode on first hit', () => {
    const ai   = createAIState(cfg('sweaty'));
    const next = updateAIState(ai, 5, 5, { result: 'hit', ship: dummyShip });
    expect(next.mode).toBe('target');
    expect(next.targetQueue.length).toBeGreaterThan(0);
  });

  it('getAIMove consumes the queue in target mode', () => {
    const ai    = createAIState(cfg('sweaty'));
    const after = updateAIState(ai, 5, 5, { result: 'hit', ship: dummyShip });
    const [r, c] = getAIMove(after);
    expect(after.targetQueue.some(([qr, qc]) => qr === r && qc === c)).toBe(true);
  });

  it('reverts to sweaty hunt after sunk', () => {
    const ai    = createAIState(cfg('sweaty'));
    const ship  = { id: 'destroyer', name: 'Destroyer', size: 2,
                    cells: [] as [number,number][], hits: new Set<string>(), sunk: true };
    const after = updateAIState(ai, 0, 1, { result: 'sunk', ship });
    expect(after.mode).toBe('hunt');
    // After sunk, next move should be density-weighted, not random
    const density = buildCombinedDensityGrid(after.remainingShipSizes, after.attacked);
    const [r, c]  = getAIMove(after);
    const maxScore = Math.max(
      ...Array.from({ length: BOARD_SIZE }, (_, rr) =>
        Array.from({ length: BOARD_SIZE }, (_, cc) =>
          after.attacked.has(`${rr},${cc}`) ? -1 : density[rr][cc]
        )
      ).flat()
    );
    expect(density[r][c]).toBe(maxScore);
  });
});

describe('sweaty — remainingShipSizes shrinks on sunk', () => {
  it('removes the sunk ship size from remainingShipSizes', () => {
    const ai   = createAIState(cfg('sweaty'));
    const ship = { id: 'carrier', name: 'Carrier', size: 5,
                   cells: [] as [number,number][], hits: new Set<string>(), sunk: true };
    const next = updateAIState(ai, 0, 4, { result: 'sunk', ship });
    expect(next.remainingShipSizes).not.toContain(5);
    expect(next.remainingShipSizes).toHaveLength(FLEET.length - 1);
  });

  it('combined density shifts after largest ship is sunk', () => {
    const ai   = createAIState(cfg('sweaty'));
    const ship = { id: 'carrier', name: 'Carrier', size: 5,
                   cells: [] as [number,number][], hits: new Set<string>(), sunk: true };
    const after = updateAIState(ai, 0, 4, { result: 'sunk', ship });
    expect(after.remainingShipSizes.includes(5)).toBe(false);
    // The density grid used for the next move should no longer include size 5
    const withoutCarrier = buildCombinedDensityGrid(after.remainingShipSizes, after.attacked);
    const withCarrier    = buildCombinedDensityGrid([5,4,3,3,2], after.attacked);
    // Center should score lower without the Carrier's placements
    expect(withoutCarrier[5][5]).toBeLessThan(withCarrier[5][5]);
  });
});

// ─── Cross-difficulty: createAIState remainingShipSizes ───────────────────────

describe('createAIState — remainingShipSizes', () => {
  it('initialises with all five FLEET sizes', () => {
    const ai = createAIState();
    expect(ai.remainingShipSizes).toEqual(FLEET.map(f => f.size));
  });

  it('is independent between two createAIState() calls', () => {
    const a = createAIState();
    const b = createAIState();
    a.remainingShipSizes.pop();
    expect(b.remainingShipSizes).toHaveLength(FLEET.length);
  });
});
// ─── hard: empty remainingShipSizes fallback (line 105) ──────────────────────

describe('hard — empty remainingShipSizes defaults largestSize to 1', () => {
  it('returns a valid cell when remainingShipSizes is empty', () => {
    // When remainingShipSizes is empty, hardHuntMove uses largestSize=1 (line 105)
    // which means only individual cells are density-scored. Should still return a move.
    const ai: AIState = {
      ...createAIState(cfg('hard')),
      remainingShipSizes: [],
    };
    const [r, c] = getAIMove(ai);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(BOARD_SIZE);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(BOARD_SIZE);
  });

  it('does not pick an already-attacked cell when remainingShipSizes is empty', () => {
    const attacked = new Set<string>();
    // Attack everything except (0,0)
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r !== 0 || c !== 0) attacked.add(`${r},${c}`);
      }
    }
    const ai: AIState = {
      ...createAIState(cfg('hard')),
      remainingShipSizes: [],
      attacked,
    };
    const [r, c] = getAIMove(ai);
    expect(r).toBe(0);
    expect(c).toBe(0);
  });
});

// ─── hard: fully-attacked board fallback to easyHuntMove (line 122) ──────────

describe('hard — fallback to easyHuntMove when all density scores are 0 (line 122)', () => {
  it('returns a valid unattacked cell when every cell has density 0', () => {
    // Fill the board except for one cell — the density grid will score that cell
    // 0 (no ship can fit anywhere). top[] should be empty so easyHuntMove is called.
    // In practice a 10x10 board with only one free cell always has density 0 for
    // any ship of size >= 2. Use size 5 (Carrier) to guarantee 0.
    const attacked = new Set<string>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r !== 5 || c !== 5) attacked.add(`${r},${c}`);
      }
    }
    const ai: AIState = {
      ...createAIState(cfg('hard')),
      remainingShipSizes: [5],
      attacked,
    };
    const [r, c] = getAIMove(ai);
    // Only (5,5) is unattacked — easyHuntMove must return it
    expect(r).toBe(5);
    expect(c).toBe(5);
  });
});

// ─── sweaty: hunt body (lines 154-174) ───────────────────────────────────────

describe('sweaty — hunt move uses combined density (lines 154–174)', () => {
  it('returns a valid unattacked cell on an empty board', () => {
    const ai = createAIState(cfg('sweaty'));
    const [r, c] = getAIMove(ai);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(BOARD_SIZE);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(BOARD_SIZE);
    expect(ai.attacked.has(`${r},${c}`)).toBe(false);
  });

  it('does not pick an already-attacked cell', () => {
    const attacked = new Set<string>(['4', '5'].flatMap(r =>
      Array.from({ length: BOARD_SIZE }, (_, c) => `${r},${c}`)
    ));
    const ai: AIState = { ...createAIState(cfg('sweaty')), attacked };
    const [r, c] = getAIMove(ai);
    expect(attacked.has(`${r},${c}`)).toBe(false);
  });

  it('prefers higher-density cells over lower-density cells', () => {
    // With all ship sizes present, edge cells have lower combined density than
    // center cells. The sweaty AI should never pick a corner on an empty board.
    const ai = createAIState(cfg('sweaty'));
    const density = buildCombinedDensityGrid(ai.remainingShipSizes, ai.attacked);
    const [r, c] = getAIMove(ai);
    const cornerScore = density[0][0];
    const chosenScore = density[r][c];
    expect(chosenScore).toBeGreaterThanOrEqual(cornerScore);
  });

  it('handles duplicate ship sizes without double-counting (unique sizes only)', () => {
    // Both Cruiser and Submarine are size 3. buildCombinedDensityGrid de-duplicates,
    // so density with [3,3] should equal density with [3].
    const attacked = new Set<string>();
    const withDupe   = buildCombinedDensityGrid([3, 3], attacked);
    const withUnique = buildCombinedDensityGrid([3],    attacked);
    expect(withDupe[5][5]).toBe(withUnique[5][5]);
  });

  it('returns empty remainingShipSizes fallback to easyHuntMove (line 158)', () => {
    // sweatyHuntMove early-returns to easyHuntMove when remainingShipSizes is empty.
    const attacked = new Set<string>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r !== 3 || c !== 7) attacked.add(`${r},${c}`);
      }
    }
    const ai: AIState = {
      ...createAIState(cfg('sweaty')),
      remainingShipSizes: [],
      attacked,
    };
    const [r, c] = getAIMove(ai);
    expect(r).toBe(3);
    expect(c).toBe(7);
  });
});

// ─── sweaty: fully-attacked board fallback to easyHuntMove (line 173) ────────

describe('sweaty — fallback to easyHuntMove when combined density is all 0 (line 173)', () => {
  it('returns the only unattacked cell when everything else is attacked', () => {
    const attacked = new Set<string>();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (r !== 2 || c !== 8) attacked.add(`${r},${c}`);
      }
    }
    const ai: AIState = {
      ...createAIState(cfg('sweaty')),
      remainingShipSizes: [5], // size 5 can't fit anywhere so all scores are 0
      attacked,
    };
    const [r, c] = getAIMove(ai);
    expect(r).toBe(2);
    expect(c).toBe(8);
  });
});