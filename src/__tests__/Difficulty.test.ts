/**
 * Difficulty type-system tests
 *
 * Verifies that:
 *  - The Difficulty union, AIConfig interface, and all difficulty constants
 *    have the correct shape and values.
 *  - createAIState() initialises AIState.config correctly for every
 *    difficulty and for the no-argument (default) call.
 *  - Every AIState transition (handleSunk, handleMiss, handleFirstHit,
 *    handleAxisHit, updateAIState) preserves AIState.config unchanged,
 *    regardless of the difficulty in use.
 */

import {
  createAIState,
  updateAIState,
  handleSunk,
  handleMiss,
  handleFirstHit,
  handleAxisHit,
  recordAttack,
} from '../ai/opponent';
import type { AIConfig, AIState, Difficulty } from '../models/types';
import {
  DIFFICULTY_LABELS,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
} from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function configFor(difficulty: Difficulty): AIConfig {
  return { difficulty };
}

function aiInTargetMode(config: AIConfig, lastHit: [number, number] = [5, 5]): AIState {
  return {
    mode:               'target',
    firstHit:           lastHit,
    lastHit,
    targetQueue:        [[4, 5], [6, 5], [5, 4], [5, 6]],
    attacked:           new Set(['5,5']),
    hitCells:           new Set(['5,5']),
    resolvedHits:       new Set<string>(),
    config,
    remainingShipSizes: [5, 4, 3, 3, 2],
  };
}

// ─── Difficulty constants ─────────────────────────────────────────────────────

describe('DIFFICULTIES constant', () => {
  it('contains exactly the four expected values', () => {
    expect(DIFFICULTIES).toEqual(['easy', 'medium', 'hard', 'sweaty']);
  });

  it('contains no duplicates', () => {
    expect(new Set(DIFFICULTIES).size).toBe(DIFFICULTIES.length);
  });

  it('has the same length as DIFFICULTY_LABELS', () => {
    expect(DIFFICULTIES.length).toBe(Object.keys(DIFFICULTY_LABELS).length);
  });
});

describe('DIFFICULTY_LABELS constant', () => {
  it('provides a label for every difficulty', () => {
    DIFFICULTIES.forEach(d => {
      expect(DIFFICULTY_LABELS[d]).toBeDefined();
    });
  });

  it('easy label is EASY', () => {
    expect(DIFFICULTY_LABELS.easy).toBe('EASY');
  });

  it('medium label is MEDIUM', () => {
    expect(DIFFICULTY_LABELS.medium).toBe('MEDIUM');
  });

  it('hard label is HARD', () => {
    expect(DIFFICULTY_LABELS.hard).toBe('HARD');
  });

  it('sweaty label is SWEATY', () => {
    expect(DIFFICULTY_LABELS.sweaty).toBe('SWEATY');
  });

  it('all label values are non-empty strings', () => {
    DIFFICULTIES.forEach(d => {
      expect(typeof DIFFICULTY_LABELS[d]).toBe('string');
      expect(DIFFICULTY_LABELS[d].length).toBeGreaterThan(0);
    });
  });
});

describe('DEFAULT_DIFFICULTY constant', () => {
  it('is medium', () => {
    expect(DEFAULT_DIFFICULTY).toBe('medium');
  });

  it('is a member of DIFFICULTIES', () => {
    expect(DIFFICULTIES).toContain(DEFAULT_DIFFICULTY);
  });
});

// ─── AIConfig shape ───────────────────────────────────────────────────────────

describe('AIConfig interface', () => {
  it('can be constructed for each difficulty without type errors', () => {
    const configs: AIConfig[] = DIFFICULTIES.map(d => ({ difficulty: d }));
    expect(configs).toHaveLength(DIFFICULTIES.length);
    configs.forEach((c, i) => {
      expect(c.difficulty).toBe(DIFFICULTIES[i]);
    });
  });
});

// ─── createAIState — config initialisation ────────────────────────────────────

describe('createAIState — config field', () => {
  it('defaults to medium when called with no argument', () => {
    expect(createAIState().config.difficulty).toBe('medium');
  });

  it('accepts easy config and stores it', () => {
    expect(createAIState(configFor('easy')).config.difficulty).toBe('easy');
  });

  it('accepts medium config and stores it', () => {
    expect(createAIState(configFor('medium')).config.difficulty).toBe('medium');
  });

  it('accepts hard config and stores it', () => {
    expect(createAIState(configFor('hard')).config.difficulty).toBe('hard');
  });

  it('config object is the exact object passed in', () => {
    const cfg = configFor('hard');
    expect(createAIState(cfg).config).toBe(cfg);
  });

  it('two calls with no argument produce independent state objects', () => {
    const a = createAIState();
    const b = createAIState();
    expect(a).not.toBe(b);
    expect(a.config).not.toBe(b.config);
    expect(a.remainingShipSizes).not.toBe(b.remainingShipSizes);
  });

  it('does not share the attacked Set between two default instances', () => {
    const a = createAIState();
    const b = createAIState();
    a.attacked.add('0,0');
    expect(b.attacked.has('0,0')).toBe(false);
  });
});

// ─── Config preservation through state transitions ────────────────────────────
//
// Every handler that constructs a new AIState must carry config forward.
// We test all six transition paths — one for each handler and one for
// the updateAIState dispatcher — across all three difficulties so that
// a future handler addition that forgets config cannot slip through.

describe('config preservation — handleSunk', () => {
  DIFFICULTIES.forEach(difficulty => {
    it(`preserves config through sunk transition (${difficulty})`, () => {
      const ai  = aiInTargetMode(configFor(difficulty));
      const att = recordAttack(ai, 4, 5);
      const next = handleSunk(ai, att);
      expect(next.config.difficulty).toBe(difficulty);
      expect(next.config).toBe(ai.config); // same reference
    });
  });
});

describe('config preservation — handleMiss', () => {
  DIFFICULTIES.forEach(difficulty => {
    it(`preserves config through miss transition (${difficulty})`, () => {
      const ai  = aiInTargetMode(configFor(difficulty));
      const att = recordAttack(ai, 4, 5);
      const next = handleMiss(ai, 4, 5, att);
      expect(next.config.difficulty).toBe(difficulty);
    });
  });

  it('preserves config through miss backtrack recovery path', () => {
    // Exhaust the queue so handleMiss takes the backtrack branch
    const cfg: AIConfig = { difficulty: 'hard' };
    const ai: AIState = {
      mode:               'target',
      firstHit:           [5, 5],
      lastHit:            [5, 6],
      targetQueue:        [[5, 7]], // only one cell — will be filtered out as the miss
      attacked:           new Set(['5,5', '5,6']),
      hitCells:           new Set<string>(),
      resolvedHits:       new Set<string>(),
      config:             cfg,
      remainingShipSizes: [5, 4, 3, 3, 2],
    };
    const att  = recordAttack(ai, 5, 7);
    const next = handleMiss(ai, 5, 7, att);
    expect(next.config.difficulty).toBe('hard');
    expect(next.config).toBe(cfg);
  });
});

describe('config preservation — handleFirstHit', () => {
  DIFFICULTIES.forEach(difficulty => {
    it(`preserves config through first-hit transition (${difficulty})`, () => {
      const ai  = createAIState(configFor(difficulty));
      const att = recordAttack(ai, 3, 3);
      const next = handleFirstHit(ai, 3, 3, att);
      expect(next.config.difficulty).toBe(difficulty);
      expect(next.config).toBe(ai.config);
    });
  });
});

describe('config preservation — handleAxisHit', () => {
  DIFFICULTIES.forEach(difficulty => {
    it(`preserves config through axis-hit transition (${difficulty})`, () => {
      const ai  = aiInTargetMode(configFor(difficulty), [5, 5]);
      const att = recordAttack(ai, 5, 6);
      const next = handleAxisHit(ai, 5, 6, att);
      expect(next.config.difficulty).toBe(difficulty);
      expect(next.config).toBe(ai.config);
    });
  });
});

describe('config preservation — updateAIState dispatcher', () => {
  DIFFICULTIES.forEach(difficulty => {
    it(`preserves config on miss outcome (${difficulty})`, () => {
      const ai   = createAIState(configFor(difficulty));
      const next = updateAIState(ai, 0, 0, { result: 'miss' });
      expect(next.config.difficulty).toBe(difficulty);
    });

    it(`preserves config on hit outcome — first hit (${difficulty})`, () => {
      const ai   = createAIState(configFor(difficulty));
      const next = updateAIState(ai, 3, 3, { result: 'hit' });
      expect(next.config.difficulty).toBe(difficulty);
    });

    it(`preserves config on hit outcome — axis hit (${difficulty})`, () => {
      const ai   = createAIState(configFor(difficulty));
      const after1 = updateAIState(ai,   3, 3, { result: 'hit' });
      const after2 = updateAIState(after1, 3, 4, { result: 'hit' });
      expect(after2.config.difficulty).toBe(difficulty);
    });

    it(`preserves config on sunk outcome (${difficulty})`, () => {
      const ai   = createAIState(configFor(difficulty));
      const next = updateAIState(ai, 0, 0, { result: 'sunk' });
      expect(next.config.difficulty).toBe(difficulty);
    });

    it(`preserves config on already-attacked outcome (${difficulty})`, () => {
      const ai   = createAIState(configFor(difficulty));
      const next = updateAIState(ai, 0, 0, { result: 'already-attacked' });
      expect(next.config.difficulty).toBe(difficulty);
    });
  });
});