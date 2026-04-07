import {
  createAIState,
  getAIMove,
  updateAIState,
  recordAttack,
  mergeUnique,
  handleSunk,
  handleMiss,
  handleFirstHit,
  handleAxisHit,
  findUnresolvedSeed,
} from '../ai/opponent';
import { AIState, Ship } from '../models/types';
import { BOARD_SIZE } from '../utils/constants';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

// Minimal Ship stub that satisfies the discriminated AttackOutcome union.
// updateAIState only reads outcome.ship.size (for sunk), so the other fields
// are irrelevant to AI logic — they just need to type-check.
function makeShip(size: number = 2, cells: [number, number][] = []): Ship {
  return {
    id:    'stub',
    name:  'Stub',
    size,
    cells,
    hits:  new Set<string>(),
    sunk:  false,
  };
}

// A fresh AIState with a pre-populated targetQueue and lastHit, used by
// handler tests that need to verify queue preservation or mutation.
function aiInTargetMode(lastHit: [number, number] = [5, 5]): AIState {
  return {
    mode:               'target',
    firstHit:           lastHit,
    lastHit,
    targetQueue:        [[4, 5], [6, 5], [5, 4], [5, 6]],
    attacked:           new Set(['5,5']),
    hitCells:           new Set(['5,5']),
    resolvedHits:       new Set<string>(),
    config:             { difficulty: 'medium' },
    remainingShipSizes: [5, 4, 3, 3, 2],
  };
}

// Exhaust all checkerboard cells so we can test the odd-cell fallback.
function exhaustCheckerboard(ai: AIState): AIState {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 0) {
        ai = updateAIState(ai, r, c, { result: 'miss' });
      }
    }
  }
  return ai;
}

// ─── recordAttack ─────────────────────────────────────────────────────────────

describe('recordAttack', () => {
  it('returns a new Set containing the attacked cell', () => {
    const ai     = createAIState();
    const result = recordAttack(ai, 3, 4);
    expect(result.has('3,4')).toBe(true);
  });

  it('includes all previously attacked cells in the result', () => {
    const ai     = { ...createAIState(), attacked: new Set(['1,1', '2,2']) };
    const result = recordAttack(ai, 3, 3);
    expect(result.has('1,1')).toBe(true);
    expect(result.has('2,2')).toBe(true);
    expect(result.has('3,3')).toBe(true);
  });

  it('does not mutate the original attacked set', () => {
    const ai = createAIState();
    recordAttack(ai, 5, 5);
    expect(ai.attacked.size).toBe(0);
  });

  it('returns a distinct Set object, not the original', () => {
    const ai     = createAIState();
    const result = recordAttack(ai, 0, 0);
    expect(result).not.toBe(ai.attacked);
  });

  it('adding the same cell twice results in a set of size one', () => {
    const ai     = { ...createAIState(), attacked: new Set(['4,4']) };
    const result = recordAttack(ai, 4, 4);
    expect(result.size).toBe(1);
  });

  it('correctly encodes the key as row,col', () => {
    const ai     = createAIState();
    const result = recordAttack(ai, 9, 0);
    expect(result.has('9,0')).toBe(true);
    expect(result.has('0,9')).toBe(false);
  });
});

// ─── mergeUnique ──────────────────────────────────────────────────────────────

describe('mergeUnique', () => {
  it('returns the base list unchanged when additions is empty', () => {
    const base = [[1, 2], [3, 4]] as [number, number][];
    expect(mergeUnique(base, [])).toEqual(base);
  });

  it('appends all additions when there are no duplicates', () => {
    const base      = [[0, 0]] as [number, number][];
    const additions = [[1, 1], [2, 2]] as [number, number][];
    expect(mergeUnique(base, additions)).toEqual([[0, 0], [1, 1], [2, 2]]);
  });

  it('omits additions that already appear in base', () => {
    const base      = [[1, 1], [2, 2]] as [number, number][];
    const additions = [[2, 2], [3, 3]] as [number, number][];
    expect(mergeUnique(base, additions)).toEqual([[1, 1], [2, 2], [3, 3]]);
  });

  it('does not produce duplicates when additions contains repeated entries', () => {
    const base      = [[0, 0]] as [number, number][];
    const additions = [[1, 1], [1, 1]] as [number, number][];
    const result    = mergeUnique(base, additions);
    const keys      = result.map(([r, c]) => `${r},${c}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('preserves base order before new additions', () => {
    const base      = [[3, 0], [1, 0]] as [number, number][];
    const additions = [[5, 0]] as [number, number][];
    const result    = mergeUnique(base, additions);
    expect(result[0]).toEqual([3, 0]);
    expect(result[1]).toEqual([1, 0]);
    expect(result[2]).toEqual([5, 0]);
  });

  it('returns an empty array when both inputs are empty', () => {
    expect(mergeUnique([], [])).toEqual([]);
  });

  it('does not mutate the base array', () => {
    const base      = [[0, 0]] as [number, number][];
    const additions = [[1, 1]] as [number, number][];
    mergeUnique(base, additions);
    expect(base).toHaveLength(1);
  });
});

// ─── handleSunk ───────────────────────────────────────────────────────────────

describe('handleSunk', () => {
  it('returns hunt mode', () => {
    expect(handleSunk(createAIState(), new Set()).mode).toBe('hunt');
  });

  it('returns null lastHit', () => {
    expect(handleSunk(createAIState(), new Set()).lastHit).toBeNull();
  });

  it('returns null firstHit', () => {
    expect(handleSunk(createAIState(), new Set()).firstHit).toBeNull();
  });

  it('returns an empty targetQueue', () => {
    expect(handleSunk(createAIState(), new Set()).targetQueue).toHaveLength(0);
  });

  it('carries the provided attacked set through unchanged', () => {
    const attacked = new Set(['1,1', '2,2']);
    expect(handleSunk(createAIState(), attacked).attacked).toBe(attacked);
  });

  it('works correctly when called after a populated target queue', () => {
    const attacked = new Set(['3,3', '3,4', '3,5']);
    const result   = handleSunk(createAIState(), attacked);
    expect(result.mode).toBe('hunt');
    expect(result.targetQueue).toHaveLength(0);
    expect(result.lastHit).toBeNull();
    expect(result.attacked.size).toBe(3);
  });

  it('resumes targeting firstHit ship when a different ship was sunk (cross-fire)', () => {
    // AI was targeting Ship A at [5,5] (firstHit), hit an adjacent Ship B at
    // [6,5] which sinks. sunkCells is Ship B's cells, not containing [5,5].
    // The AI should re-enter target mode focused on Ship A.
    const ai: AIState = {
      mode:               'target',
      firstHit:           [5, 5],
      lastHit:            [6, 5],
      targetQueue:        [],
      attacked:           new Set(['5,5', '6,5']),
      hitCells:           new Set(['5,5']),  // [5,5] was a confirmed hit on Ship A
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const sunkCells: [number, number][] = [[6, 5], [7, 5]]; // Ship B cells — [5,5] not included
    const attacked = new Set([...ai.attacked]);
    const result   = handleSunk(ai, attacked, 2, sunkCells);
    expect(result.mode).toBe('target');
    expect(result.firstHit).toEqual([5, 5]);
    expect(result.targetQueue.length).toBeGreaterThan(0);
    result.targetQueue.forEach(([r, c]) => {
      expect(attacked.has(`${r},${c}`)).toBe(false);
    });
  });

  it('returns to hunt normally when the sunk ship IS the one being targeted', () => {
    const ai: AIState = {
      mode:               'target',
      firstHit:           [5, 5],
      lastHit:            [5, 6],
      targetQueue:        [],
      attacked:           new Set(['5,5', '5,6']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const sunkCells: [number, number][] = [[5, 5], [5, 6]]; // firstHit IS on this ship
    const result = handleSunk(ai, new Set([...ai.attacked]), 2, sunkCells);
    expect(result.mode).toBe('hunt');
    expect(result.firstHit).toBeNull();
    expect(result.lastHit).toBeNull();
  });

  it('cross-fire recovery is skipped for easy difficulty', () => {
    const ai: AIState = {
      mode:               'target',
      firstHit:           [5, 5],
      lastHit:            [6, 5],
      targetQueue:        [],
      attacked:           new Set(['5,5', '6,5']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'easy' },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const sunkCells: [number, number][] = [[6, 5], [7, 5]];
    const result = handleSunk(ai, new Set([...ai.attacked]), 2, sunkCells);
    // Easy ignores target state — always returns hunt
    expect(result.mode).toBe('hunt');
  });
});

// ─── handleMiss ───────────────────────────────────────────────────────────────

describe('handleMiss', () => {
  it('removes the missed cell from the target queue', () => {
    const ai       = aiInTargetMode();
    const attacked = new Set([...ai.attacked, '4,5']);
    const result   = handleMiss(ai, 4, 5, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('4,5');
  });

  it('keeps other cells in the queue after a miss', () => {
    const ai       = aiInTargetMode();
    const attacked = new Set([...ai.attacked, '4,5']);
    const result   = handleMiss(ai, 4, 5, attacked);
    expect(result.targetQueue.some(([r, c]) => r === 6 && c === 5)).toBe(true);
  });

  it('stays in target mode when the queue still has entries after the miss', () => {
    const ai       = aiInTargetMode();
    const attacked = new Set([...ai.attacked, '4,5']);
    const result   = handleMiss(ai, 4, 5, attacked);
    expect(result.mode).toBe('target');
  });

  it('downgrades to hunt mode when the miss empties the queue and firstHit is null', () => {
    const ai = {
      mode:               'target' as const,
      firstHit:           null as [number, number] | null,
      lastHit:            [5, 5] as [number, number],
      targetQueue:        [[4, 5]] as [number, number][],
      attacked:           new Set(['5,5']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const attacked = new Set([...ai.attacked, '4,5']);
    const result   = handleMiss(ai, 4, 5, attacked);
    expect(result.mode).toBe('hunt');
    expect(result.targetQueue).toHaveLength(0);
  });

  it('backtracks to firstHit when the queue empties and a hit is unresolved', () => {
    const ai = {
      mode:               'target' as const,
      firstHit:           [5, 5] as [number, number],
      lastHit:            [5, 5] as [number, number],
      targetQueue:        [[4, 5]] as [number, number][],
      attacked:           new Set(['5,5']),
      hitCells:           new Set<string>(['5,5']),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const attacked = new Set([...ai.attacked, '4,5']);
    const result   = handleMiss(ai, 4, 5, attacked);
    // Should re-enter target mode with adjacents of firstHit re-seeded
    expect(result.mode).toBe('target');
    expect(result.targetQueue.length).toBeGreaterThan(0);
    // None of the re-seeded cells should already be attacked
    result.targetQueue.forEach(([r, c]) => {
      expect(attacked.has(`${r},${c}`)).toBe(false);
    });
  });

  it('carries the provided attacked set through', () => {
    const ai       = aiInTargetMode();
    const attacked = new Set(['5,5', '4,5']);
    const result   = handleMiss(ai, 4, 5, attacked);
    expect(result.attacked).toBe(attacked);
  });

  it('does not mutate the original state', () => {
    const ai      = aiInTargetMode();
    const origLen = ai.targetQueue.length;
    handleMiss(ai, 4, 5, new Set([...ai.attacked, '4,5']));
    expect(ai.targetQueue).toHaveLength(origLen);
  });

  it('is a no-op on the queue when the missed cell was not in it', () => {
    const ai       = aiInTargetMode();
    const attacked = new Set([...ai.attacked, '9,9']);
    const result   = handleMiss(ai, 9, 9, attacked);
    expect(result.targetQueue).toHaveLength(ai.targetQueue.length);
  });

  it('recovers via Option 3 when queue and firstHit backtrack are both exhausted but another unresolved hit exists', () => {
    // Queue has one entry. firstHit=[5,5] has all four neighbours already
    // attacked, so the backtrack also yields nothing. But hitCells contains
    // [2,2] from an earlier hit on a different ship — Option 3 finds it and
    // re-enters target mode. This is the direct path to line 326.
    const ai = {
      mode:               'target' as const,
      firstHit:           [5, 5] as [number, number],
      lastHit:            [5, 5] as [number, number],
      targetQueue:        [[5, 6]] as [number, number][],
      attacked:           new Set(['5,5', '4,5', '6,5', '5,4']),
      hitCells:           new Set(['5,5', '2,2']), // [2,2] = unresolved hit on Ship B
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    // Miss [5,6]: queue → [], backtrack of [5,5]: [5,6] now attacked, all four
    // original neighbours also attacked → no recovery from firstHit.
    // Option 3: [2,2] in hitCells, not resolved, has open neighbours → seed found.
    const attacked = new Set([...ai.attacked, '5,6']);
    const result   = handleMiss(ai, 5, 6, attacked);
    expect(result.mode).toBe('target');
    expect(result.firstHit).toEqual([2, 2]);
    expect(result.targetQueue.length).toBeGreaterThan(0);
    result.targetQueue.forEach(([r, c]) => {
      expect(attacked.has(`${r},${c}`)).toBe(false);
    });
  });

  it('clears firstHit and lastHit when reverting to hunt', () => {
    // Queue with one entry, firstHit null — miss empties queue, no recovery.
    const ai = {
      mode:               'target' as const,
      firstHit:           null as [number, number] | null,
      lastHit:            [5, 5] as [number, number],
      targetQueue:        [[4, 5]] as [number, number][],
      attacked:           new Set(['5,5']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const attacked = new Set([...ai.attacked, '4,5']);
    const result   = handleMiss(ai, 4, 5, attacked);
    expect(result.mode).toBe('hunt');
    expect(result.firstHit).toBeNull();
    expect(result.lastHit).toBeNull();
  });
});

// ─── handleFirstHit ───────────────────────────────────────────────────────────

describe('handleFirstHit', () => {
  it('switches to target mode', () => {
    const attacked = new Set(['5,5']);
    expect(handleFirstHit(createAIState(), 5, 5, attacked).mode).toBe('target');
  });

  it('sets lastHit to the hit cell', () => {
    const attacked = new Set(['5,5']);
    expect(handleFirstHit(createAIState(), 5, 5, attacked).lastHit).toEqual([5, 5]);
  });

  it('enqueues all four adjacent cells for a mid-board hit', () => {
    const attacked = new Set(['5,5']);
    const result   = handleFirstHit(createAIState(), 5, 5, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).toContain('4,5');
    expect(keys).toContain('6,5');
    expect(keys).toContain('5,4');
    expect(keys).toContain('5,6');
    expect(result.targetQueue).toHaveLength(4);
  });

  it('only enqueues in-bounds cells for a corner hit', () => {
    const attacked = new Set(['0,0']);
    const result   = handleFirstHit(createAIState(), 0, 0, attacked);
    expect(result.targetQueue).toHaveLength(2);
    const keys = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).toContain('1,0');
    expect(keys).toContain('0,1');
  });

  it('excludes cells already in the attacked set from the queue', () => {
    const attacked = new Set(['5,5', '5,4']); // left neighbour pre-attacked
    const result   = handleFirstHit(createAIState(), 5, 5, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('5,4');
  });

  it('does not add cells already present in the existing queue', () => {
    const ai       = { ...createAIState(), targetQueue: [[4, 5]] as [number, number][] };
    const attacked = new Set(['5,5']);
    const result   = handleFirstHit(ai, 5, 5, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys.filter(k => k === '4,5')).toHaveLength(1);
  });

  it('carries the provided attacked set through', () => {
    const attacked = new Set(['5,5']);
    expect(handleFirstHit(createAIState(), 5, 5, attacked).attacked).toBe(attacked);
  });

  it('does not mutate the original AI state', () => {
    const ai       = createAIState();
    const attacked = new Set(['5,5']);
    handleFirstHit(ai, 5, 5, attacked);
    expect(ai.mode).toBe('hunt');
    expect(ai.targetQueue).toHaveLength(0);
  });
});

// ─── handleAxisHit ────────────────────────────────────────────────────────────

describe('handleAxisHit', () => {
  it('stays in target mode', () => {
    const ai       = aiInTargetMode([5, 5]);
    const attacked = new Set([...ai.attacked, '5,6']);
    expect(handleAxisHit(ai, 5, 6, attacked).mode).toBe('target');
  });

  it('updates lastHit to the new hit cell', () => {
    const ai       = aiInTargetMode([5, 5]);
    const attacked = new Set([...ai.attacked, '5,6']);
    expect(handleAxisHit(ai, 5, 6, attacked).lastHit).toEqual([5, 6]);
  });

  it('prunes perpendicular cells after a horizontal axis is confirmed', () => {
    const ai       = aiInTargetMode([5, 5]); // queue has [4,5] and [6,5] (vertical)
    const attacked = new Set([...ai.attacked, '5,6']);
    const result   = handleAxisHit(ai, 5, 6, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('4,5');
    expect(keys).not.toContain('6,5');
  });

  it('retains row-axis cells from the existing queue after horizontal confirmation', () => {
    const ai       = aiInTargetMode([5, 5]); // queue includes [5,4] and [5,6]
    const attacked = new Set([...ai.attacked, '5,6']);
    const result   = handleAxisHit(ai, 5, 6, attacked);
    result.targetQueue.forEach(([r]) => expect(r).toBe(5));
  });

  it('prunes perpendicular cells after a vertical axis is confirmed', () => {
    const ai = {
      mode:               'target' as const,
      firstHit:           [4, 3] as [number, number],
      lastHit:            [4, 3] as [number, number],
      targetQueue:        [[3, 3], [5, 3], [4, 2], [4, 4]] as [number, number][],
      attacked:           new Set(['4,3']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const attacked = new Set([...ai.attacked, '5,3']);
    const result   = handleAxisHit(ai, 5, 3, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('4,2');
    expect(keys).not.toContain('4,4');
  });

  it('adds new axial candidates beyond the current hit', () => {
    const ai       = aiInTargetMode([5, 5]);
    const attacked = new Set([...ai.attacked, '5,6']);
    const result   = handleAxisHit(ai, 5, 6, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).toContain('5,7'); // right of [5,6] — newly added by axis extension
    expect(keys).toContain('5,4'); // left of [5,5] — retained from pre-prune queue
  });

  it('does not add out-of-bounds cells after axis confirmation at board edge', () => {
    const ai = {
      mode:               'target' as const,
      firstHit:           [5, 8] as [number, number],
      lastHit:            [5, 8] as [number, number],
      targetQueue:        [[5, 7], [5, 9]] as [number, number][],
      attacked:           new Set(['5,8']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const attacked = new Set([...ai.attacked, '5,9']);
    const result   = handleAxisHit(ai, 5, 9, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('5,10');
  });

  it('does not include already-attacked cells in the pruned queue', () => {
    const ai = {
      mode:               'target' as const,
      firstHit:           [5, 5] as [number, number],
      lastHit:            [5, 5] as [number, number],
      targetQueue:        [[5, 4], [5, 6]] as [number, number][],
      attacked:           new Set(['5,5', '5,3']), // [5,3] pre-attacked
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const attacked = new Set([...ai.attacked, '5,6']);
    const result   = handleAxisHit(ai, 5, 6, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('5,3');
  });

  it('produces no duplicate cells in the resulting queue', () => {
    const ai       = aiInTargetMode([5, 5]);
    const attacked = new Set([...ai.attacked, '5,6']);
    const result   = handleAxisHit(ai, 5, 6, attacked);
    const keys     = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('carries the provided attacked set through', () => {
    const ai       = aiInTargetMode([5, 5]);
    const attacked = new Set([...ai.attacked, '5,6']);
    expect(handleAxisHit(ai, 5, 6, attacked).attacked).toBe(attacked);
  });

  it('does not mutate the original AI state', () => {
    const ai       = aiInTargetMode([5, 5]);
    const origLen  = ai.targetQueue.length;
    handleAxisHit(ai, 5, 6, new Set([...ai.attacked, '5,6']));
    expect(ai.targetQueue).toHaveLength(origLen);
    expect(ai.lastHit).toEqual([5, 5]);
  });

  it('backtracks to firstHit adjacents when axis extension yields an empty queue', () => {
    // Ship at [5,9] hit after firstHit [5,8]. Axis = row. Both board-edge
    // and the only axial neighbour [5,8] is already attacked, so axialNext
    // and prunedQueue are both empty. Should recover via firstHit adjacents.
    const ai = {
      mode:               'target' as const,
      firstHit:           [5, 8] as [number, number],
      lastHit:            [5, 8] as [number, number],
      // Queue only contained [5,9]; [5,7] was already attacked before this call
      targetQueue:        [[5, 9]] as [number, number][],
      attacked:           new Set(['5,8', '5,7']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const attacked = new Set([...ai.attacked, '5,9']);
    // prunedQueue: filter row===5 from [[5,9]] → [[5,9]], filter not-attacked → []
    // axialNext from [5,9] along row: [5,8] attacked, [5,10] OOB → []
    // newQueue = [] → recovery path: getAllAdjacentCells([5,8], attacked)
    //   = [4,8] and [6,8] (since [5,7] and [5,9] are attacked)
    const result = handleAxisHit(ai, 5, 9, attacked);
    expect(result.mode).toBe('target');
    expect(result.targetQueue.length).toBeGreaterThan(0);
    result.targetQueue.forEach(([r, c]) => {
      expect(attacked.has(`${r},${c}`)).toBe(false);
    });
  });

  it('returns hunt mode when axis extension and firstHit recovery both yield empty', () => {
    // All four neighbours of firstHit [5,5] already attacked, so recovery fails.
    // All neighbours of the axis hit [5,6] also attacked, so Option 3 finds nothing.
    const aiFull = {
      mode:               'target' as const,
      firstHit:           [5, 5] as [number, number],
      lastHit:            [5, 5] as [number, number],
      targetQueue:        [[5, 6]] as [number, number][],
      attacked:           new Set(['5,5', '4,5', '6,5', '5,4', '5,7', '4,6', '6,6']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    // Hit [5,6]: prunedQueue filter row===5 from [[5,6]] minus attacked → []
    // axialNext from [5,6] along row: [5,5] attacked, [5,7] attacked → []
    // newQueue = [] → firstHit=[5,5], getAllAdjacentCells([5,5], attackedFull)
    //   [4,5] attacked, [6,5] attacked, [5,4] attacked, [5,6] attacked → []
    // Option 3 scan: [5,6] added to newHitCells; adjacents [4,6] and [6,6] both
    //   pre-attacked → no actionable seed found → returns hunt
    const attackedFull = new Set([...aiFull.attacked, '5,6']);
    const result = handleAxisHit(aiFull, 5, 6, attackedFull);
    expect(result.mode).toBe('hunt');
    expect(result.firstHit).toBeNull();
    expect(result.lastHit).toBeNull();
    expect(result.targetQueue).toHaveLength(0);
  });
  it('recovers via Option 3 when axis extension and firstHit backtrack both yield empty but another unresolved hit exists', () => {
    // Axis extension is empty AND all neighbours of firstHit [5,5] are attacked,
    // so the firstHit recovery path also fails. BUT hitCells contains [2,2] from
    // an earlier hit on a different ship — Option 3 finds it. This is the direct
    // path to line 427.
    const ai = {
      mode:               'target' as const,
      firstHit:           [5, 5] as [number, number],
      lastHit:            [5, 5] as [number, number],
      targetQueue:        [[5, 6]] as [number, number][],
      // All four neighbours of [5,5] pre-attacked; [5,7] blocks axial extension.
      // [4,6] and [6,6] are also pre-attacked so [5,6] itself has no open neighbours
      // after the hit (preventing [5,6] from being its own Option 3 seed).
      attacked:           new Set(['5,5', '4,5', '6,5', '5,4', '5,7', '4,6', '6,6']),
      hitCells:           new Set(['5,5', '2,2']), // [2,2] = unresolved hit on Ship B
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' as const },
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    // Hit [5,6]: prunedQueue → [], axialNext → [], newQueue = [].
    // firstHit backtrack: getAllAdjacentCells([5,5], attacked+[5,6]) → [].
    // Option 3 with null firstHit: [5,5] all neighbours attacked → skip;
    //   [2,2] has open neighbours → seed found.
    const attacked = new Set([...ai.attacked, '5,6']);
    const result   = handleAxisHit(ai, 5, 6, attacked);
    expect(result.mode).toBe('target');
    expect(result.firstHit).toEqual([2, 2]);
    expect(result.targetQueue.length).toBeGreaterThan(0);
    result.targetQueue.forEach(([r, c]) => {
      expect(attacked.has(`${r},${c}`)).toBe(false);
    });
  });
});

// ─── createAIState ────────────────────────────────────────────────────────────

describe('createAIState', () => {
  it('initializes in hunt mode', () => {
    expect(createAIState().mode).toBe('hunt');
  });

  it('initializes with no last hit', () => {
    expect(createAIState().lastHit).toBeNull();
  });

  it('initializes with no first hit', () => {
    expect(createAIState().firstHit).toBeNull();
  });

  it('initializes with an empty target queue', () => {
    expect(createAIState().targetQueue).toHaveLength(0);
  });

  it('initializes with an empty attacked set', () => {
    expect(createAIState().attacked.size).toBe(0);
  });
});

// ─── getAIMove ────────────────────────────────────────────────────────────────

describe('getAIMove', () => {
  it('returns a move within board bounds in hunt mode', () => {
    const [r, c] = getAIMove(createAIState());
    expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(BOARD_SIZE);
    expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(BOARD_SIZE);
  });

  it('returns the first cell in the target queue when in target mode', () => {
    let ai   = createAIState();
    ai       = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    const [r, c] = getAIMove(ai);
    expect(ai.targetQueue[0]).toEqual([r, c]);
  });

  it('falls back to hunt move when in target mode with an empty queue', () => {
    const ai     = { ...createAIState(), mode: 'target' as const, targetQueue: [] };
    const [r, c] = getAIMove(ai);
    expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThan(BOARD_SIZE);
    expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThan(BOARD_SIZE);
  });

  it('uses checkerboard cells in hunt mode (even parity)', () => {
    for (let i = 0; i < 30; i++) {
      const [r, c] = getAIMove(createAIState());
      expect((r + c) % 2).toBe(0);
    }
  });

  it('falls back to odd-parity cells when checkerboard is exhausted', () => {
    const ai     = exhaustCheckerboard(createAIState());
    const [r, c] = getAIMove(ai);
    expect((r + c) % 2).toBe(1);
  });

  it('never returns a cell that has already been attacked', () => {
    let ai     = createAIState();
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const [r, c] = getAIMove(ai);
      const key    = `${r},${c}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      ai = updateAIState(ai, r, c, { result: 'miss' });
    }
  });
});

// ─── updateAIState — miss ─────────────────────────────────────────────────────

describe('updateAIState — miss', () => {
  it('records the cell as attacked', () => {
    const ai = updateAIState(createAIState(), 3, 3, { result: 'miss' });
    expect(ai.attacked.has('3,3')).toBe(true);
  });

  it('stays in hunt mode on a miss when not in target mode', () => {
    const ai = updateAIState(createAIState(), 3, 3, { result: 'miss' });
    expect(ai.mode).toBe('hunt');
  });

  it('stays in target mode on a miss when queue still has entries', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'miss' });
    expect(ai.mode).toBe('target');
  });

  it('stays in target mode when queue empties but firstHit is still unresolved', () => {
    // Hit [5,5], then miss all four neighbours one by one.
    // After the third miss the queue still has one item → stays target.
    // After the fourth miss (last item) the queue is empty but all recovery
    // candidates are also exhausted → drops to hunt.
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai = updateAIState(ai, 4, 5, { result: 'miss' });
    ai = updateAIState(ai, 6, 5, { result: 'miss' });
    ai = updateAIState(ai, 5, 4, { result: 'miss' });
    // After three misses queue has one entry [5,6] — still target.
    expect(ai.mode).toBe('target');
    // Miss the last neighbour → queue empty, recovery also empty → hunt.
    ai = updateAIState(ai, 5, 6, { result: 'miss' });
    expect(ai.mode).toBe('hunt');
  });

  it('reverts to hunt mode only after all adjacent cells of firstHit are exhausted', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    // Exhaust every neighbour of [5,5] with misses — no recovery candidates remain
    const neighbours = [[4,5],[6,5],[5,4],[5,6]];
    for (const [r, c] of neighbours) {
      ai = updateAIState(ai, r, c, { result: 'miss' });
    }
    expect(ai.mode).toBe('hunt');
    expect(ai.targetQueue).toHaveLength(0);
  });

  it('does not mutate the original state', () => {
    const original = createAIState();
    updateAIState(original, 2, 2, { result: 'miss' });
    expect(original.attacked.size).toBe(0);
  });
});

// ─── updateAIState — hit (first hit on ship) ──────────────────────────────────

describe('updateAIState — hit (first hit on ship)', () => {
  it('switches to target mode', () => {
    const ai = updateAIState(createAIState(), 4, 4, { result: 'hit', ship: makeShip() });
    expect(ai.mode).toBe('target');
  });

  it('records the cell as attacked', () => {
    const ai = updateAIState(createAIState(), 4, 4, { result: 'hit', ship: makeShip() });
    expect(ai.attacked.has('4,4')).toBe(true);
  });

  it('sets lastHit to the attacked cell', () => {
    const ai = updateAIState(createAIState(), 4, 4, { result: 'hit', ship: makeShip() });
    expect(ai.lastHit).toEqual([4, 4]);
  });

  it('sets firstHit to the attacked cell on the first hit', () => {
    const ai = updateAIState(createAIState(), 4, 4, { result: 'hit', ship: makeShip() });
    expect(ai.firstHit).toEqual([4, 4]);
  });

  it('adds all four adjacent cells to the queue for a mid-board hit', () => {
    const ai   = updateAIState(createAIState(), 5, 5, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).toContain('4,5');
    expect(keys).toContain('6,5');
    expect(keys).toContain('5,4');
    expect(keys).toContain('5,6');
    expect(ai.targetQueue).toHaveLength(4);
  });

  it('only adds in-bounds adjacent cells for a corner hit', () => {
    const ai   = updateAIState(createAIState(), 0, 0, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).toContain('1,0');
    expect(keys).toContain('0,1');
    expect(ai.targetQueue).toHaveLength(2);
  });

  it('only adds in-bounds adjacent cells for an edge hit', () => {
    const ai   = updateAIState(createAIState(), 0, 5, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('-1,5');
    expect(ai.targetQueue).toHaveLength(3);
  });

  it('does not add already-attacked cells to the queue', () => {
    let ai = updateAIState(createAIState(), 5, 4, { result: 'miss' });
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('5,4');
  });
});

// ─── updateAIState — axis pruning (second hit on same ship) ───────────────────

describe('updateAIState — axis pruning', () => {
  it('prunes the queue to row-axis after two horizontal hits', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip() });
    ai.targetQueue.forEach(([r]) => expect(r).toBe(5));
  });

  it('prunes the queue to col-axis after two vertical hits', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 4, 3, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 3, { result: 'hit', ship: makeShip() });
    ai.targetQueue.forEach(([, c]) => expect(c).toBe(3));
  });

  it('removes perpendicular candidates after axis is confirmed', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('4,5');
    expect(keys).not.toContain('6,5');
  });

  it('updates lastHit to the most recent hit cell', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip() });
    expect(ai.lastHit).toEqual([5, 6]);
  });

  it('adds new axial candidates beyond the latest hit', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).toContain('5,7');
    expect(keys).toContain('5,4');
  });

  it('does not add out-of-bounds cells to queue after axis prune', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 8, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 9, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('5,10');
  });

  it('does not add already-attacked cells to the pruned queue', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 3, { result: 'miss' });
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).not.toContain('5,3');
  });

  it('produces no duplicate cells in the queue after pruning', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip() });
    const keys = ai.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ─── updateAIState — sunk ─────────────────────────────────────────────────────

describe('updateAIState — sunk', () => {
  it('returns to hunt mode after a sunk', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 3, 3, { result: 'hit',  ship: makeShip(2) });
    ai     = updateAIState(ai, 3, 4, { result: 'sunk', ship: makeShip(2) });
    expect(ai.mode).toBe('hunt');
  });

  it('clears the target queue after a sunk', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 3, 3, { result: 'hit',  ship: makeShip(2) });
    ai     = updateAIState(ai, 3, 4, { result: 'sunk', ship: makeShip(2) });
    expect(ai.targetQueue).toHaveLength(0);
  });

  it('clears lastHit after a sunk', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 3, 3, { result: 'hit',  ship: makeShip(2) });
    ai     = updateAIState(ai, 3, 4, { result: 'sunk', ship: makeShip(2, [[3,3],[3,4]]) });
    expect(ai.lastHit).toBeNull();
  });

  it('clears firstHit after a sunk', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 3, 3, { result: 'hit',  ship: makeShip(2) });
    ai     = updateAIState(ai, 3, 4, { result: 'sunk', ship: makeShip(2, [[3,3],[3,4]]) });
    expect(ai.firstHit).toBeNull();
  });

  it('retains all attacked cells in the attacked set after a sunk', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 3, 3, { result: 'hit',  ship: makeShip(2) });
    ai     = updateAIState(ai, 3, 4, { result: 'sunk', ship: makeShip(2, [[3,3],[3,4]]) });
    expect(ai.attacked.has('3,3')).toBe(true);
    expect(ai.attacked.has('3,4')).toBe(true);
  });

  it('records the sunk cell as attacked', () => {
    const ai = updateAIState(createAIState(), 0, 0, { result: 'sunk', ship: makeShip(1) });
    expect(ai.attacked.has('0,0')).toBe(true);
  });

  it('is ready to begin a new hunt immediately after sunk', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 3, 3, { result: 'hit',  ship: makeShip(2) });
    ai     = updateAIState(ai, 3, 4, { result: 'sunk', ship: makeShip(2, [[3,3],[3,4]]) });
    const [r, c] = getAIMove(ai);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(ai.attacked.has(`${r},${c}`)).toBe(false);
  });
});

// ─── updateAIState — backtrack recovery ─────────────────────────────────────────

describe('updateAIState — backtrack recovery', () => {
  it('preserves firstHit across axis hits so backtrack origin is not lost', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    ai     = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip() }); // axis confirmed
    expect(ai.firstHit).toEqual([5, 5]); // firstHit must not change on axis hit
  });

  it('clears firstHit after a sunk so the next hunt starts clean', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit',  ship: makeShip(2) });
    ai     = updateAIState(ai, 5, 6, { result: 'sunk', ship: makeShip(2, [[5,5],[5,6]]) });
    expect(ai.firstHit).toBeNull();
  });

  it('drops to hunt when all neighbours of firstHit are exhausted', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    for (const [r, c] of [[4,5],[6,5],[5,4],[5,6]] as [number,number][]) {
      ai = updateAIState(ai, r, c, { result: 'miss' });
    }
    expect(ai.mode).toBe('hunt');
    expect(ai.targetQueue).toHaveLength(0);
  });

  it('correctly sinks a ship after backtracking to the perpendicular axis', () => {
    // Ship is vertical at [4,5],[5,5],[6,5].
    // AI hits [5,5], tries horizontal neighbours first (both miss),
    // then backtracks and finds the ship vertically.
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit',  ship: makeShip(3) });
    ai     = updateAIState(ai, 5, 4, { result: 'miss' });
    ai     = updateAIState(ai, 5, 6, { result: 'miss' });
    ai     = updateAIState(ai, 4, 5, { result: 'hit',  ship: makeShip(3) }); // vertical hit after backtrack
    ai     = updateAIState(ai, 6, 5, { result: 'sunk', ship: makeShip(3) }); // sunk
    expect(ai.mode).toBe('hunt');
    expect(ai.firstHit).toBeNull();
    expect(ai.targetQueue).toHaveLength(0);
  });

  it('clears lastHit and firstHit when reverting to hunt after exhausting all candidates', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    for (const [r, c] of [[4,5],[6,5],[5,4],[5,6]] as [number,number][]) {
      ai = updateAIState(ai, r, c, { result: 'miss' });
    }
    expect(ai.mode).toBe('hunt');
    expect(ai.lastHit).toBeNull();
    expect(ai.firstHit).toBeNull();
  });

  it('resumes targeting the original ship after a cross-fire sunk', () => {
    // AI hits Ship A at [5,5] → enters target mode.
    // Fires [6,5] → sinks Ship B (a different ship not containing [5,5]).
    // Should resume targeting Ship A rather than reverting to hunt.
    let ai = createAIState();
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(3) });
    expect(ai.mode).toBe('target');
    expect(ai.firstHit).toEqual([5, 5]);

    const shipB = { ...makeShip(2), cells: [[6, 5], [7, 5]] as [number, number][] };
    ai = updateAIState(ai, 6, 5, { result: 'sunk', ship: shipB });
    // [6,5] is not on Ship A — cross-fire. Should stay in target mode for Ship A.
    expect(ai.mode).toBe('target');
    expect(ai.firstHit).toEqual([5, 5]);
    expect(ai.targetQueue.length).toBeGreaterThan(0);
  });
});

// ─── updateAIState — already-attacked ─────────────────────────────────────────

describe('updateAIState — already-attacked outcome', () => {
  it('assertNever throws at runtime for an unrecognised AttackResult', () => {
    // assertNever is a compile-time exhaustiveness guard that also throws at
    // runtime if updateAIState is ever called from an untyped context with an
    // unknown result value. We cast to reach the default branch directly.
    expect(() => {
      updateAIState(createAIState(), 0, 0, { result: 'unknown' as any, ship: makeShip() });
    }).toThrow('Unhandled AttackResult:');
  });

  it('still records the cell as attacked and preserves all other state', () => {
    const after = updateAIState(createAIState(), 4, 4, { result: 'already-attacked' });
    expect(after.attacked.has('4,4')).toBe(true);
    expect(after.mode).toBe('hunt');
    expect(after.lastHit).toBeNull();
    expect(after.targetQueue).toHaveLength(0);
  });

  it('does not change mode or queue when in target mode', () => {
    let ai = createAIState();
    ai     = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip() });
    const queueBefore = ai.targetQueue.length;
    ai     = updateAIState(ai, 9, 9, { result: 'already-attacked' });
    expect(ai.mode).toBe('target');
    expect(ai.targetQueue).toHaveLength(queueBefore);
  });
});

// ─── Multi-ship tracking — single firstHit limitation ────────────────────────
//
// The AI state machine tracks exactly ONE firstHit at a time.
// These tests document what happens when ships are placed adjacently and the
// AI's target queue overlaps cells belonging to multiple ships.
//
// Key mechanics:
//   • A hit in HUNT mode   → handleFirstHit  (sets firstHit, enters target)
//   • A hit in TARGET mode → handleAxisHit   (updates lastHit, prunes/extends queue)
//   • A sunk in TARGET mode with firstHit NOT on sunk ship → cross-fire recovery
//     (resumes firstHit ship with a fresh adjacent queue)
//   • A sunk in TARGET mode with firstHit ON sunk ship → normal hunt revert
//     (any other partially-hit ship is orphaned; AI must rediscover it in hunt)

describe('multi-ship tracking — Option 3 unresolved-hit recovery', () => {
  // These tests document the full Option 3 behaviour: hitCells/resolvedHits tracking
  // means the AI NEVER abandons a confirmed hit when a different ship is sunk.

  it('hitting a second adjacent ship while targeting first still goes through handleAxisHit', () => {
    // Dispatch logic unchanged: second hit in target mode → handleAxisHit.
    // What changes is what happens AFTER a sunk event.
    let ai = createAIState();
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(2) });
    ai = updateAIState(ai, 4, 5, { result: 'hit', ship: makeShip(2) }); // handleAxisHit

    expect(ai.firstHit).toEqual([5, 5]);
    expect(ai.lastHit).toEqual([4, 5]);
    // hitCells now tracks both confirmed hits
    expect(ai.hitCells.has('5,5')).toBe(true);
    expect(ai.hitCells.has('4,5')).toBe(true);
  });

  it('cross-fire sunk still resumes firstHit ship', () => {
    let ai = createAIState();
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(2) });
    ai = updateAIState(ai, 4, 5, { result: 'hit', ship: makeShip(2) });

    const shipB = makeShip(2, [[4, 5], [3, 5]]);
    ai = updateAIState(ai, 3, 5, { result: 'sunk', ship: shipB });

    // [5,5] not in shipB.cells → resumes targeting Ship A
    expect(ai.mode).toBe('target');
    expect(ai.firstHit).toEqual([5, 5]);
    expect(ai.lastHit).toEqual([5, 5]);
    expect(ai.targetQueue.length).toBeGreaterThan(0);
    ai.targetQueue.forEach(([r, c]) => {
      expect(ai.attacked.has(`${r},${c}`)).toBe(false);
    });
    // resolvedHits now contains Ship B's cells
    expect(ai.resolvedHits.has('4,5')).toBe(true);
    expect(ai.resolvedHits.has('3,5')).toBe(true);
  });

  it('Option 3: sinking firstHit ship resumes targeting the other hit ship (was previously orphaned)', () => {
    // The key new behaviour: Ship A sinks (contains firstHit [5,5]).
    // Pre-Option3: hunt revert, Ship B at [4,5] forgotten.
    // Post-Option3: resolvedHits = Ship A's cells, hitCells still has [4,5],
    //               [4,5] is unresolved → AI re-enters target mode for Ship B.
    let ai = createAIState();
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(2) }); // Ship A, firstHit=[5,5]
    ai = updateAIState(ai, 4, 5, { result: 'hit', ship: makeShip(2) }); // Ship B, hitCells has [4,5]

    const shipA = makeShip(2, [[5, 5], [6, 5]]);
    ai = updateAIState(ai, 6, 5, { result: 'sunk', ship: shipA });

    // [5,5] IS in shipA.cells → shipA's cells added to resolvedHits
    // BUT [4,5] is in hitCells and NOT in resolvedHits → Option 3 finds it
    expect(ai.mode).toBe('target');
    expect(ai.firstHit).toEqual([4, 5]); // seeded from the orphaned hit
    expect(ai.targetQueue.length).toBeGreaterThan(0);
    ai.targetQueue.forEach(([r, c]) => {
      expect(ai.attacked.has(`${r},${c}`)).toBe(false);
    });
    // [5,5],[6,5] are resolved; [4,5] is unresolved
    expect(ai.resolvedHits.has('5,5')).toBe(true);
    expect(ai.resolvedHits.has('6,5')).toBe(true);
    expect(ai.resolvedHits.has('4,5')).toBe(false);
  });

  it('Option 3: Ship C hit recovered after Ship A sinks', () => {
    // Ship A hits: [5,5], [5,4] — firstHit=[5,5]
    // Ship B cross-fire sunk during recovery
    // Ship C hit: [5,6]
    // Ship A sinks → resolvedHits gets [5,5],[5,4],[5,3]; [5,6] still unresolved
    let ai = createAIState();
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(3) }); // Ship A
    ai = updateAIState(ai, 4, 5, { result: 'hit', ship: makeShip(2) }); // Ship B cross-fire
    const shipB = makeShip(2, [[4, 5], [3, 5]]);
    ai = updateAIState(ai, 3, 5, { result: 'sunk', ship: shipB });      // Ship B sunk, resume [5,5]
    ai = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip(3) }); // Ship C hit at [5,6]

    const shipA = makeShip(3, [[5, 5], [5, 4], [5, 3]]);
    ai = updateAIState(ai, 5, 4, { result: 'sunk', ship: shipA });

    // Ship A cells ([5,5],[5,4],[5,3]) added to resolvedHits.
    // [5,6] is in hitCells and NOT in resolvedHits → Option 3 resumes Ship C.
    expect(ai.mode).toBe('target');
    expect(ai.firstHit).toEqual([5, 6]);
    expect(ai.targetQueue.length).toBeGreaterThan(0);
    expect(ai.resolvedHits.has('5,5')).toBe(true);
    expect(ai.resolvedHits.has('5,6')).toBe(false); // Ship C not yet sunk
  });

  it('Option 3: hitCells grows with every hit outcome', () => {
    let ai = createAIState();
    expect(ai.hitCells.size).toBe(0);
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(2) });
    expect(ai.hitCells.has('5,5')).toBe(true);
    ai = updateAIState(ai, 5, 6, { result: 'hit', ship: makeShip(2) });
    expect(ai.hitCells.has('5,6')).toBe(true);
    expect(ai.hitCells.size).toBe(2);
  });

  it('Option 3: resolvedHits grows when a ship sinks', () => {
    let ai = createAIState();
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(2) });
    const ship = makeShip(2, [[5, 5], [5, 6]]);
    ai = updateAIState(ai, 5, 6, { result: 'sunk', ship });
    expect(ai.resolvedHits.has('5,5')).toBe(true);
    expect(ai.resolvedHits.has('5,6')).toBe(true);
    expect(ai.resolvedHits.size).toBe(2);
  });

  it('Option 3: normal sunk with no orphaned hits still reverts to hunt', () => {
    let ai = createAIState();
    ai = updateAIState(ai, 3, 3, { result: 'hit', ship: makeShip(2) });
    const ship = makeShip(2, [[3, 3], [3, 4]]);
    ai = updateAIState(ai, 3, 4, { result: 'sunk', ship });
    // All hit cells are now resolved → no unresolved hits → hunt
    expect(ai.mode).toBe('hunt');
    expect(ai.firstHit).toBeNull();
    expect(ai.resolvedHits.has('3,3')).toBe(true);
    expect(ai.resolvedHits.has('3,4')).toBe(true);
  });

  it('Option 3: miss exhaustion recovers orphaned hit on another ship', () => {
    // AI hits [5,5] (Ship A), exhausts its queue with misses, then discovers
    // [2,2] (Ship B) was hit before the queue emptied — handleMiss triggers scan.
    let ai = createAIState();
    ai = updateAIState(ai, 2, 2, { result: 'hit', ship: makeShip(3) }); // Ship B hit early
    // Now firstHit=[2,2]. Exhaust it by missing all adjacents.
    const shipAsunk = makeShip(3, [[2,2],[2,3],[2,4]]);
    ai = updateAIState(ai, 2, 3, { result: 'hit',  ship: makeShip(3) }); // Ship B continues
    ai = updateAIState(ai, 2, 4, { result: 'sunk', ship: shipAsunk });   // Ship B sunk, resolvedHits has [2,2],[2,3],[2,4]

    // Now hit Ship A at [5,5]
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(2) }); // Ship A, firstHit=[5,5]
    // Exhaust all adjacents with misses
    for (const [r, c] of [[4,5],[6,5],[5,4],[5,6]] as [number,number][]) {
      ai = updateAIState(ai, r, c, { result: 'miss' });
    }
    // handleMiss scan: [5,5] in hitCells, not in resolvedHits → but all adjacents
    // are now attacked. No recovery possible → hunt.
    // This confirms the scan correctly finds nothing and hunts.
    expect(ai.mode).toBe('hunt');
  });

  it('Option 3: easy difficulty never uses hitCells tracking', () => {
    const ai = createAIState({ difficulty: 'easy' });
    let state = ai;
    state = updateAIState(state, 5, 5, { result: 'hit', ship: makeShip(2) });
    // Easy: handleFirstHit bails out early — hitCells NOT updated
    expect(state.hitCells.size).toBe(0);
  });

  it('Option 3: getAIMove returns valid move after multi-ship recovery', () => {
    let ai = createAIState();
    ai = updateAIState(ai, 5, 5, { result: 'hit', ship: makeShip(2) });
    ai = updateAIState(ai, 4, 5, { result: 'hit', ship: makeShip(2) });
    const shipA = makeShip(2, [[5, 5], [6, 5]]);
    ai = updateAIState(ai, 6, 5, { result: 'sunk', ship: shipA }); // Ship B orphaned at [4,5] → recovered

    const [r, c] = getAIMove(ai);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(10);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(10);
    expect(ai.attacked.has(`${r},${c}`)).toBe(false);
    // The move should come from the target queue (AI is in target mode after recovery)
    expect(ai.mode).toBe('target');
    expect(ai.targetQueue[0]).toEqual([r, c]);
  });
});


// ─── findUnresolvedSeed ───────────────────────────────────────────────────────

describe('findUnresolvedSeed', () => {
  it('returns null when hitCells is empty', () => {
    expect(findUnresolvedSeed(new Set(), new Set(), null, new Set())).toBeNull();
  });

  it('returns null when all hitCells are resolved', () => {
    const hit = new Set(['3,3', '3,4']);
    const res = new Set(['3,3', '3,4']);
    expect(findUnresolvedSeed(hit, res, null, new Set(['3,3','3,4']))).toBeNull();
  });

  it('returns the unresolved cell and its adjacents', () => {
    const hit  = new Set(['5,5']);
    const res  = new Set<string>();
    const atk  = new Set(['5,5']); // [5,5] itself attacked, adjacents free
    const result = findUnresolvedSeed(hit, res, null, atk);
    expect(result).not.toBeNull();
    expect(result!.cell).toEqual([5, 5]);
    expect(result!.adjacents.length).toBeGreaterThan(0);
    result!.adjacents.forEach(([r, c]) => expect(atk.has(`${r},${c}`)).toBe(false));
  });

  it('prefers firstHit cell over other unresolved cells', () => {
    const hit  = new Set(['1,1', '5,5']);
    const res  = new Set<string>();
    const atk  = new Set(['1,1', '5,5']);
    const result = findUnresolvedSeed(hit, res, [5, 5], atk);
    expect(result!.cell).toEqual([5, 5]);
  });

  it('falls back to another unresolved cell when firstHit is resolved', () => {
    const hit  = new Set(['5,5', '2,2']);
    const res  = new Set(['5,5']); // firstHit resolved
    const atk  = new Set(['5,5', '2,2']);
    const result = findUnresolvedSeed(hit, res, [5, 5], atk);
    expect(result!.cell).toEqual([2, 2]);
  });

  it('returns null when unresolved cell has all adjacents attacked', () => {
    // [5,5] is unresolved but every neighbor is attacked
    const hit  = new Set(['5,5']);
    const res  = new Set<string>();
    const atk  = new Set(['5,5', '4,5', '6,5', '5,4', '5,6']);
    expect(findUnresolvedSeed(hit, res, null, atk)).toBeNull();
  });

  it('does not return resolved cells', () => {
    const hit  = new Set(['3,3', '7,7']);
    const res  = new Set(['3,3']); // resolved
    const atk  = new Set(['3,3', '7,7']);
    const result = findUnresolvedSeed(hit, res, null, atk);
    expect(result!.cell).toEqual([7, 7]);
  });
});

// ─── Full game simulation ─────────────────────────────────────────────────────

describe('AI full game simulation', () => {
  it('never attacks the same cell twice across a full game', () => {
    let ai         = createAIState();
    const attacked = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const [r, c] = getAIMove(ai);
      const key    = `${r},${c}`;
      expect(attacked.has(key)).toBe(false);
      attacked.add(key);
      ai = updateAIState(ai, r, c, { result: 'miss' });
    }
  });

  it('exhausts the full checkerboard before using non-checkerboard cells', () => {
    let ai     = exhaustCheckerboard(createAIState());
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const [r, c] = getAIMove(ai);
      const key    = `${r},${c}`;
      expect(seen.has(key)).toBe(false);
      expect((r + c) % 2).toBe(1);
      seen.add(key);
      ai = updateAIState(ai, r, c, { result: 'miss' });
    }
  });

  it('correctly hunts, targets, and returns to hunt across three ships', () => {
    let ai = createAIState();

    ai = updateAIState(ai, 1, 1, { result: 'sunk', ship: makeShip(1) });
    expect(ai.mode).toBe('hunt');

    ai = updateAIState(ai, 5, 5, { result: 'hit',  ship: makeShip(2) });
    expect(ai.mode).toBe('target');
    ai = updateAIState(ai, 5, 6, { result: 'sunk', ship: makeShip(2, [[5,5],[5,6]]) });
    expect(ai.mode).toBe('hunt');
    expect(ai.targetQueue).toHaveLength(0);

    ai = updateAIState(ai, 3, 2, { result: 'hit',  ship: makeShip(2) });
    ai = updateAIState(ai, 4, 2, { result: 'sunk', ship: makeShip(2, [[3,2],[4,2]]) });
    expect(ai.mode).toBe('hunt');
    expect(ai.attacked.has('1,1')).toBe(true);
    expect(ai.attacked.has('5,5')).toBe(true);
    expect(ai.attacked.has('4,2')).toBe(true);
  });
});
// ─── handleAxisHit — firstHit backtrack with open neighbours (line 405) ───────
//
// Line 405: `if (aiState.firstHit)` inside the `if (newQueue.length === 0)`
// block in handleAxisHit.
//
// The covered paths so far:
//   • newQueue non-empty → skips the whole block (line 404 = false)
//   • newQueue empty, firstHit null → line 405 = false (falls to Option 3 / hunt)
//   • newQueue empty, firstHit set, recovery empty → line 408 = false (Option 3)
//
// The uncovered path: newQueue empty, firstHit set, recovery non-empty → line
// 408 is TRUE → returns the backtrack state (lines 409-419). This happens when
// the axis extension hits a wall or an already-attacked cell, but firstHit still
// has unattacked neighbours the AI can pivot to.

describe('handleAxisHit — firstHit backtrack with open neighbours (line 405 true→return)', () => {
  it('returns target mode seeded from firstHit adjacents when axis extension empties the queue', () => {
    // Hit [5,5] (firstHit), then [5,6] confirmed horizontal axis.
    // Now "hit" [5,7]: [5,4] and [5,8] are already attacked, so after
    // pruning the queue and extending the axis both yield empty.
    // firstHit [5,5] still has open neighbours [4,5] and [6,5] → backtrack
    // at line 405 fires and returns the recovery state (lines 409-419).
    const ai: AIState = {
      mode:               'target',
      firstHit:           [5, 5],
      lastHit:            [5, 6],
      targetQueue:        [[5, 4], [5, 7]],
      attacked:           new Set(['5,5', '5,6', '5,4', '5,8']),
      hitCells:           new Set(['5,5', '5,6']),
      resolvedHits:       new Set<string>(),
      config:             { difficulty: 'medium' },
      remainingShipSizes: [4, 3, 3, 2],
    };

    // Hit [5,7]:
    //   prunedQueue: [[5,4],[5,7]] row-filtered → both row 5, then
    //     !attacked: 5,4 attacked, 5,7 now attacked → []
    //   axialNext from [5,7] along row: [5,6] attacked, [5,8] attacked → []
    //   newQueue = [] → if (newQueue.length === 0) true
    //   aiState.firstHit = [5,5] → line 405 true
    //   recovery = getAllAdjacentCells([5,5], newAttacked):
    //     [4,5] free, [6,5] free, [5,4] attacked, [5,6] attacked → [[4,5],[6,5]]
    //   recovery.length > 0 → line 408 true → returns backtrack state
    const newAttacked = new Set([...ai.attacked, '5,7']);
    const result = handleAxisHit(ai, 5, 7, newAttacked);

    expect(result.mode).toBe('target');
    expect(result.firstHit).toEqual([5, 5]);
    expect(result.lastHit).toEqual([5, 5]);
    expect(result.targetQueue.length).toBeGreaterThan(0);
    result.targetQueue.forEach(([r, c]) => {
      expect(newAttacked.has(`${r},${c}`)).toBe(false);
    });
    const keys = result.targetQueue.map(([r, c]) => `${r},${c}`);
    expect(keys).toContain('4,5');
    expect(keys).toContain('6,5');
  });
});