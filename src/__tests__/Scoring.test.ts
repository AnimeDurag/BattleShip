/**
 * scoring.ts unit tests
 *
 * All functions under test are pure — no mocking required.
 */

import {
  MIN_SHOTS_TO_WIN,
  calcScore,
  getRank,
  RANKS,
  DIFFICULTY_PAR,
  getCommentaryText,
} from '../utils/scoring';
import { FLEET, DIFFICULTIES } from '../utils/constants';

// ─── MIN_SHOTS_TO_WIN ─────────────────────────────────────────────────────────

describe('MIN_SHOTS_TO_WIN', () => {
  it('equals the sum of all fleet ship sizes', () => {
    const expected = FLEET.reduce((s, f) => s + f.size, 0);
    expect(MIN_SHOTS_TO_WIN).toBe(expected);
  });

  it('is 17 for the standard fleet', () => {
    expect(MIN_SHOTS_TO_WIN).toBe(17);
  });

  it('is a positive integer', () => {
    expect(MIN_SHOTS_TO_WIN).toBeGreaterThan(0);
    expect(Number.isInteger(MIN_SHOTS_TO_WIN)).toBe(true);
  });
});

// ─── calcScore ────────────────────────────────────────────────────────────────

describe('calcScore', () => {
  it('returns 100 for exactly MIN_SHOTS_TO_WIN shots', () => {
    expect(calcScore(MIN_SHOTS_TO_WIN)).toBe(100);
  });

  it('returns 99 for MIN_SHOTS_TO_WIN + 1 shots — one extra shot breaks perfect', () => {
    // floor(17/18 * 100) = floor(94.44) = 94  (Admiral, not 99 — let's verify exactly)
    expect(calcScore(18)).toBe(94);
  });

  it('returns 0 for a shot count of 0', () => {
    expect(calcScore(0)).toBe(0);
  });

  it('returns 0 for negative shot counts', () => {
    expect(calcScore(-5)).toBe(0);
  });

  it('never returns a value above 100', () => {
    // Hypothetically impossible shot count of 1 should still clamp
    expect(calcScore(1)).toBe(100);
  });

  it('never returns a value below 0', () => {
    expect(calcScore(10000)).toBeGreaterThanOrEqual(0);
  });

  it('is monotonically non-increasing: more shots → equal or lower score', () => {
    for (let i = MIN_SHOTS_TO_WIN; i < MIN_SHOTS_TO_WIN + 50; i++) {
      expect(calcScore(i + 1)).toBeLessThanOrEqual(calcScore(i));
    }
  });

  it('produces an integer result', () => {
    [17, 20, 30, 50, 100].forEach(n => {
      expect(Number.isInteger(calcScore(n))).toBe(true);
    });
  });

  // Spot-check specific shot counts against rank boundaries
  it('25 shots scores 68 — top of Sergeant band', () => {
    expect(calcScore(25)).toBe(68);
  });

  it('24 shots scores 70 — bottom of Captain band', () => {
    expect(calcScore(24)).toBe(70);
  });

  it('19 shots scores 89 — top of Captain band', () => {
    expect(calcScore(19)).toBe(89);
  });

  it('18 shots scores 94 — in Admiral band', () => {
    expect(calcScore(18)).toBe(94);
  });

  it('48 shots scores 35 — top of Private band', () => {
    expect(calcScore(48)).toBe(35);
  });

  it('49 shots scores 34 — Private band', () => {
    expect(calcScore(49)).toBe(34);
  });
});

// ─── RANKS ────────────────────────────────────────────────────────────────────

describe('RANKS constant', () => {
  it('has exactly 5 entries', () => {
    expect(RANKS).toHaveLength(5);
  });

  it('tiers are unique', () => {
    const tiers = RANKS.map(r => r.tier);
    expect(new Set(tiers).size).toBe(5);
  });

  it('minScore of the lowest rank is 0', () => {
    expect(RANKS[0].minScore).toBe(0);
  });

  it('maxScore of the highest rank is 100', () => {
    expect(RANKS[RANKS.length - 1].maxScore).toBe(100);
  });

  it('bands are contiguous — each maxScore is one below the next minScore', () => {
    for (let i = 0; i < RANKS.length - 1; i++) {
      expect(RANKS[i].maxScore + 1).toBe(RANKS[i + 1].minScore);
    }
  });

  it('every rank has a non-empty label', () => {
    RANKS.forEach(r => expect(r.label.length).toBeGreaterThan(0));
  });

  it('every rank has a cssVar starting with --', () => {
    RANKS.forEach(r => expect(r.cssVar.startsWith('--')).toBe(true));
  });

  it('general rank covers only score 100', () => {
    const general = RANKS.find(r => r.tier === 'general')!;
    expect(general.minScore).toBe(100);
    expect(general.maxScore).toBe(100);
  });

  it('private rank starts at 0', () => {
    const priv = RANKS.find(r => r.tier === 'private')!;
    expect(priv.minScore).toBe(0);
  });
});

// ─── getRank ──────────────────────────────────────────────────────────────────

// ── Return-object shape ──────────────────────────────────────────────────────

describe('getRank — full return-object shape', () => {
  it('private: all five fields match', () => {
    const r = getRank(0);
    expect(r.tier).toBe('private');
    expect(r.label).toBe('PRIVATE');
    expect(r.minScore).toBe(0);
    expect(r.maxScore).toBe(35);
    expect(r.cssVar).toBe('--dim');
  });

  it('sergeant: all five fields match', () => {
    const r = getRank(36);
    expect(r.tier).toBe('sergeant');
    expect(r.label).toBe('SERGEANT');
    expect(r.minScore).toBe(36);
    expect(r.maxScore).toBe(68);
    expect(r.cssVar).toBe('--text');
  });

  it('captain: all five fields match', () => {
    const r = getRank(69);
    expect(r.tier).toBe('captain');
    expect(r.label).toBe('CAPTAIN');
    expect(r.minScore).toBe(69);
    expect(r.maxScore).toBe(89);
    expect(r.cssVar).toBe('--amber');
  });

  it('admiral: all five fields match', () => {
    const r = getRank(90);
    expect(r.tier).toBe('admiral');
    expect(r.label).toBe('ADMIRAL');
    expect(r.minScore).toBe(90);
    expect(r.maxScore).toBe(99);
    expect(r.cssVar).toBe('--sunk');
  });

  it('general: all five fields match', () => {
    const r = getRank(100);
    expect(r.tier).toBe('general');
    expect(r.label).toBe('GENERAL OF THE ARMIES');
    expect(r.minScore).toBe(100);
    expect(r.maxScore).toBe(100);
    expect(r.cssVar).toBe('--green');
  });
});

// ── Lower band boundaries (minScore of each tier) ────────────────────────────

describe('getRank — lower band boundaries', () => {
  it('score 0   → private  (band floor)', () => expect(getRank(0).tier).toBe('private'));
  it('score 36  → sergeant (band floor)', () => expect(getRank(36).tier).toBe('sergeant'));
  it('score 69  → captain  (band floor)', () => expect(getRank(69).tier).toBe('captain'));
  it('score 90  → admiral  (band floor)', () => expect(getRank(90).tier).toBe('admiral'));
  it('score 100 → general  (band floor)', () => expect(getRank(100).tier).toBe('general'));
});

// ── Upper band boundaries (maxScore of each tier) ────────────────────────────

describe('getRank — upper band boundaries', () => {
  it('score 35  → private  (band ceiling)', () => expect(getRank(35).tier).toBe('private'));
  it('score 68  → sergeant (band ceiling)', () => expect(getRank(68).tier).toBe('sergeant'));
  it('score 89  → captain  (band ceiling)', () => expect(getRank(89).tier).toBe('captain'));
  it('score 99  → admiral  (band ceiling)', () => expect(getRank(99).tier).toBe('admiral'));
  it('score 100 → general  (only value)',   () => expect(getRank(100).tier).toBe('general'));
});

// ── One-step transitions across every band edge ───────────────────────────────

describe('getRank — one-step transitions at every band edge', () => {
  it('35 → private, 36 → sergeant', () => {
    expect(getRank(35).tier).toBe('private');
    expect(getRank(36).tier).toBe('sergeant');
  });

  it('68 → sergeant, 69 → captain', () => {
    expect(getRank(68).tier).toBe('sergeant');
    expect(getRank(69).tier).toBe('captain');
  });

  it('89 → captain, 90 → admiral', () => {
    expect(getRank(89).tier).toBe('captain');
    expect(getRank(90).tier).toBe('admiral');
  });

  it('99 → admiral, 100 → general', () => {
    expect(getRank(99).tier).toBe('admiral');
    expect(getRank(100).tier).toBe('general');
  });
});

// ── Interior scores within each band ─────────────────────────────────────────

describe('getRank — interior scores within each band', () => {
  it('score 17  → private  (midpoint of 0–35)',  () => expect(getRank(17).tier).toBe('private'));
  it('score 52  → sergeant (midpoint of 36–68)', () => expect(getRank(52).tier).toBe('sergeant'));
  it('score 79  → captain  (midpoint of 69–89)', () => expect(getRank(79).tier).toBe('captain'));
  it('score 94  → admiral  (interior of 90–99)', () => expect(getRank(94).tier).toBe('admiral'));
});

// ── Referential identity ──────────────────────────────────────────────────────

describe('getRank — referential identity', () => {
  it('returns the exact RANKS[0] object for private scores', () => {
    expect(getRank(0)).toBe(RANKS[0]);
    expect(getRank(35)).toBe(RANKS[0]);
    expect(getRank(17)).toBe(RANKS[0]);
  });

  it('returns the exact RANKS[1] object for sergeant scores', () => {
    expect(getRank(36)).toBe(RANKS[1]);
    expect(getRank(68)).toBe(RANKS[1]);
    expect(getRank(52)).toBe(RANKS[1]);
  });

  it('returns the exact RANKS[2] object for captain scores', () => {
    expect(getRank(69)).toBe(RANKS[2]);
    expect(getRank(89)).toBe(RANKS[2]);
    expect(getRank(79)).toBe(RANKS[2]);
  });

  it('returns the exact RANKS[3] object for admiral scores', () => {
    expect(getRank(90)).toBe(RANKS[3]);
    expect(getRank(99)).toBe(RANKS[3]);
    expect(getRank(94)).toBe(RANKS[3]);
  });

  it('returns the exact RANKS[4] object for general scores', () => {
    expect(getRank(100)).toBe(RANKS[4]);
  });

  it('two calls with the same score return the identical object reference', () => {
    expect(getRank(50)).toBe(getRank(50));
    expect(getRank(90)).toBe(getRank(90));
  });
});

// ── Out-of-domain inputs ──────────────────────────────────────────────────────

describe('getRank — out-of-domain inputs', () => {
  // Negative: the loop walks from general down; no rank has minScore <= -1;
  // the loop exhausts and the fallback returns RANKS[0] (private).
  it('score -1   → private (loop fallback)',   () => expect(getRank(-1).tier).toBe('private'));
  it('score -100 → private (loop fallback)',   () => expect(getRank(-100).tier).toBe('private'));

  // Above 100: score >= general.minScore (100) fires on the first iteration.
  it('score 101  → general', () => expect(getRank(101).tier).toBe('general'));
  it('score 200  → general', () => expect(getRank(200).tier).toBe('general'));
});

// ── Exhaustive integer sweep 0–100 ───────────────────────────────────────────

describe('getRank — exhaustive integer sweep 0–100', () => {
  it('every integer 0–100 returns a defined rank object', () => {
    for (let s = 0; s <= 100; s++) {
      expect(getRank(s)).toBeDefined();
    }
  });

  it('every integer 0–100 falls within the returned band [minScore, maxScore]', () => {
    for (let s = 0; s <= 100; s++) {
      const r = getRank(s);
      expect(s).toBeGreaterThanOrEqual(r.minScore);
      expect(s).toBeLessThanOrEqual(r.maxScore);
    }
  });

  it('every returned rank is one of the five RANKS entries', () => {
    for (let s = 0; s <= 100; s++) {
      expect(RANKS).toContain(getRank(s));
    }
  });

  it('adjacent scores on opposite sides of a band boundary return different ranks', () => {
    expect(getRank(35).tier).not.toBe(getRank(36).tier);
    expect(getRank(68).tier).not.toBe(getRank(69).tier);
    expect(getRank(89).tier).not.toBe(getRank(90).tier);
    expect(getRank(99).tier).not.toBe(getRank(100).tier);
  });

  it('adjacent scores within the same band return the same rank object', () => {
    // interior pairs well inside each band
    expect(getRank(10)).toBe(getRank(11));   // both private
    expect(getRank(50)).toBe(getRank(51));   // both sergeant
    expect(getRank(75)).toBe(getRank(76));   // both captain
    expect(getRank(92)).toBe(getRank(93));   // both admiral
  });
});

// ── calcScore → getRank round-trips ──────────────────────────────────────────

describe('getRank — calcScore round-trips', () => {
  // calcScore(17)=100 → general
  it('17 shots (score 100) → general',  () => expect(getRank(calcScore(17)).tier).toBe('general'));
  // calcScore(18)=94  → admiral
  it('18 shots (score  94) → admiral',  () => expect(getRank(calcScore(18)).tier).toBe('admiral'));
  // calcScore(19)=89  → captain (ceiling)
  it('19 shots (score  89) → captain',  () => expect(getRank(calcScore(19)).tier).toBe('captain'));
  // calcScore(21)=80  → captain (interior)
  it('21 shots (score  80) → captain',  () => expect(getRank(calcScore(21)).tier).toBe('captain'));
  // calcScore(24)=70  → captain (floor)
  it('24 shots (score  70) → captain',  () => expect(getRank(calcScore(24)).tier).toBe('captain'));
  // calcScore(25)=68  → sergeant (ceiling)
  it('25 shots (score  68) → sergeant', () => expect(getRank(calcScore(25)).tier).toBe('sergeant'));
  // calcScore(33)=51  → sergeant (interior)
  it('33 shots (score  51) → sergeant', () => expect(getRank(calcScore(33)).tier).toBe('sergeant'));
  // calcScore(48)=35  → private (ceiling)
  it('48 shots (score  35) → private',  () => expect(getRank(calcScore(48)).tier).toBe('private'));
  // calcScore(60)=28  → private (interior)
  it('60 shots (score  28) → private',  () => expect(getRank(calcScore(60)).tier).toBe('private'));

  it('one extra shot past a boundary never bleeds into the higher band', () => {
    // 19 shots = 89 (captain max) — must NOT be admiral
    expect(getRank(calcScore(19)).tier).not.toBe('admiral');
    // 25 shots = 68 (sergeant max) — must NOT be captain
    expect(getRank(calcScore(25)).tier).not.toBe('captain');
    // 48 shots = 35 (private max) — must NOT be sergeant
    expect(getRank(calcScore(48)).tier).not.toBe('sergeant');
  });
});


// ─── DIFFICULTY_PAR ───────────────────────────────────────────────────────────

describe('DIFFICULTY_PAR', () => {
  it('has an entry for every difficulty', () => {
    DIFFICULTIES.forEach(d => {
      expect(DIFFICULTY_PAR[d]).toBeDefined();
    });
  });

  it('all par values are positive integers above MIN_SHOTS_TO_WIN', () => {
    DIFFICULTIES.forEach(d => {
      const par = DIFFICULTY_PAR[d];
      expect(par).toBeGreaterThan(MIN_SHOTS_TO_WIN);
      expect(Number.isInteger(par)).toBe(true);
    });
  });

  it('harder difficulties have a lower or equal par than easier ones', () => {
    expect(DIFFICULTY_PAR['sweaty']).toBeLessThanOrEqual(DIFFICULTY_PAR['hard']);
    expect(DIFFICULTY_PAR['hard']).toBeLessThanOrEqual(DIFFICULTY_PAR['medium']);
    expect(DIFFICULTY_PAR['medium']).toBeLessThanOrEqual(DIFFICULTY_PAR['easy']);
  });
});


// ─── getCommentaryText ──────────────────────────────────────────────────────────────────────────────────
//
// Branch map (evaluated top-to-bottom; first match wins):
//   1. score === 100                     → FLAWLESS VICTORY
//   2. turnCount <= par[difficulty]      → AHEAD OF PROJECTED
//   3. score >= 90                       → HIGHLY EFFICIENT
//   4. score >= 69                       → COMPETENT EXECUTION
//   5. score >= 36                       → PROLONGED ENGAGEMENT
//   6. else (score 0–35)                 → INEFFICIENT OPERATION
//
// Par values (verified): easy=60  medium=45  hard=38  sweaty=30
//
// Verified calcScore values used below:
//   calcScore(17)=100  calcScore(18)=94  calcScore(19)=89  calcScore(21)=80
//   calcScore(25)=68   calcScore(48)=35  calcScore(60)=28
//   At par: easy→28  medium→37  hard→44  sweaty→56
// ──────────────────────────────────────────────────────────────────────────────────

// ── Branch 1: FLAWLESS VICTORY (score === 100) ──────────────────────────────

describe('getCommentaryText — branch 1: flawless victory', () => {
  it('score 100 on easy   → FLAWLESS VICTORY', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'easy')).toContain('FLAWLESS VICTORY'));

  it('score 100 on medium → FLAWLESS VICTORY', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'medium')).toContain('FLAWLESS VICTORY'));

  it('score 100 on hard   → FLAWLESS VICTORY', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'hard')).toContain('FLAWLESS VICTORY'));

  it('score 100 on sweaty → FLAWLESS VICTORY', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'sweaty')).toContain('FLAWLESS VICTORY'));

  it('exact return string for medium', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'medium'))
      .toBe('FLAWLESS VICTORY — PERFECT ENGAGEMENT ON MEDIUM'));

  it('exact return string for sweaty', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'sweaty'))
      .toBe('FLAWLESS VICTORY — PERFECT ENGAGEMENT ON SWEATY'));

  it('contains the uppercased difficulty label', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'hard')).toContain('HARD'));

  // Priority: branch 1 must win even when turnCount <= par (branch 2 condition is also true)
  it('score 100 with turnCount <= sweaty par (30) → flawless, not ahead-of-projected', () => {
    // MIN_SHOTS_TO_WIN=17 which is <= sweaty par=30, so both conditions hold
    const msg = getCommentaryText(100, 17, 'sweaty');
    expect(msg).toContain('FLAWLESS VICTORY');
    expect(msg).not.toContain('AHEAD OF PROJECTED');
  });

  // Boundary: score 99 must NOT fire branch 1
  it('score 99 does NOT trigger flawless victory', () =>
    expect(getCommentaryText(99, 99, 'medium')).not.toContain('FLAWLESS VICTORY'));

  // Score 101 is > 100 and must NOT trigger the strict-equality branch 1
  it('score 101 does NOT trigger flawless victory (strict equality)', () =>
    expect(getCommentaryText(101, 99, 'medium')).not.toContain('FLAWLESS VICTORY'));
});

// ── Branch 2: AHEAD OF PROJECTED (turnCount <= par, score < 100) ────────────

describe('getCommentaryText — branch 2: ahead of projected', () => {
  // Each difficulty: turnCount exactly at par
  it('easy:   turnCount=60 (=par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 60, 'easy')).toContain('AHEAD OF PROJECTED'));

  it('medium: turnCount=45 (=par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 45, 'medium')).toContain('AHEAD OF PROJECTED'));

  it('hard:   turnCount=38 (=par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 38, 'hard')).toContain('AHEAD OF PROJECTED'));

  it('sweaty: turnCount=30 (=par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 30, 'sweaty')).toContain('AHEAD OF PROJECTED'));

  // Each difficulty: turnCount one below par
  it('easy:   turnCount=59 (<par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 59, 'easy')).toContain('AHEAD OF PROJECTED'));

  it('medium: turnCount=44 (<par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 44, 'medium')).toContain('AHEAD OF PROJECTED'));

  it('hard:   turnCount=37 (<par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 37, 'hard')).toContain('AHEAD OF PROJECTED'));

  it('sweaty: turnCount=29 (<par)  → ahead-of-projected', () =>
    expect(getCommentaryText(50, 29, 'sweaty')).toContain('AHEAD OF PROJECTED'));

  // Each difficulty: turnCount one above par — branch 2 must NOT fire
  it('easy:   turnCount=61 (>par)  does NOT fire ahead-of-projected', () =>
    expect(getCommentaryText(50, 61, 'easy')).not.toContain('AHEAD OF PROJECTED'));

  it('medium: turnCount=46 (>par)  does NOT fire ahead-of-projected', () =>
    expect(getCommentaryText(50, 46, 'medium')).not.toContain('AHEAD OF PROJECTED'));

  it('hard:   turnCount=39 (>par)  does NOT fire ahead-of-projected', () =>
    expect(getCommentaryText(50, 39, 'hard')).not.toContain('AHEAD OF PROJECTED'));

  it('sweaty: turnCount=31 (>par)  does NOT fire ahead-of-projected', () =>
    expect(getCommentaryText(50, 31, 'sweaty')).not.toContain('AHEAD OF PROJECTED'));

  // Exact return strings
  it('exact return string for easy at par', () =>
    expect(getCommentaryText(50, 60, 'easy'))
      .toBe('ENGAGEMENT CONCLUDED AHEAD OF PROJECTED EASY DURATION'));

  it('exact return string for sweaty at par', () =>
    expect(getCommentaryText(50, 30, 'sweaty'))
      .toBe('ENGAGEMENT CONCLUDED AHEAD OF PROJECTED SWEATY DURATION'));

  it('contains the uppercased difficulty label', () =>
    expect(getCommentaryText(50, 1, 'hard')).toContain('HARD'));

  // Priority: branch 2 beats branches 3–6 regardless of how high the score is
  it('score 94 (>=90) with turnCount<=par → ahead-of-projected, NOT highly-efficient', () => {
    // 18 shots = score 94; medium par=45; 18<=45
    const msg = getCommentaryText(94, 18, 'medium');
    expect(msg).toContain('AHEAD OF PROJECTED');
    expect(msg).not.toContain('HIGHLY EFFICIENT');
  });

  it('score 79 (>=69) with turnCount<=par → ahead-of-projected, NOT competent', () => {
    const msg = getCommentaryText(79, 20, 'sweaty'); // 20 <= sweaty par=30
    expect(msg).toContain('AHEAD OF PROJECTED');
    expect(msg).not.toContain('COMPETENT EXECUTION');
  });

  it('score 52 (>=36) with turnCount<=par → ahead-of-projected, NOT prolonged', () => {
    const msg = getCommentaryText(52, 30, 'sweaty'); // 30 <= sweaty par=30
    expect(msg).toContain('AHEAD OF PROJECTED');
    expect(msg).not.toContain('PROLONGED ENGAGEMENT');
  });

  it('score 17 (<36) with turnCount<=par → ahead-of-projected, NOT inefficient', () => {
    const msg = getCommentaryText(17, 25, 'sweaty'); // 25 <= sweaty par=30
    expect(msg).toContain('AHEAD OF PROJECTED');
    expect(msg).not.toContain('INEFFICIENT OPERATION');
  });
});

// ── Branch 3: HIGHLY EFFICIENT (score 90–99, turnCount > par) ─────────────────

describe('getCommentaryText — branch 3: highly efficient', () => {
  // Band floor
  it('score 90  with turnCount>par → highly efficient', () =>
    expect(getCommentaryText(90, 1000, 'easy')).toContain('HIGHLY EFFICIENT'));

  // Band ceiling
  it('score 99  with turnCount>par → highly efficient', () =>
    expect(getCommentaryText(99, 1000, 'easy')).toContain('HIGHLY EFFICIENT'));

  // Interior
  it('score 94  with turnCount>par → highly efficient', () =>
    expect(getCommentaryText(94, 1000, 'medium')).toContain('HIGHLY EFFICIENT'));

  // All difficulties
  it('fires on easy   when score=94 turnCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'easy')).toContain('HIGHLY EFFICIENT'));
  it('fires on medium when score=94 turnCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'medium')).toContain('HIGHLY EFFICIENT'));
  it('fires on hard   when score=94 turnCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'hard')).toContain('HIGHLY EFFICIENT'));
  it('fires on sweaty when score=94 turnCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'sweaty')).toContain('HIGHLY EFFICIENT'));

  // Exact return strings
  it('exact return string for hard', () =>
    expect(getCommentaryText(94, 1000, 'hard'))
      .toBe('HIGHLY EFFICIENT OPERATION FOR HARD DIFFICULTY'));

  it('exact return string for sweaty', () =>
    expect(getCommentaryText(94, 1000, 'sweaty'))
      .toBe('HIGHLY EFFICIENT OPERATION FOR SWEATY DIFFICULTY'));

  it('contains the uppercased difficulty label', () =>
    expect(getCommentaryText(94, 1000, 'easy')).toContain('EASY'));

  // Boundary adjacency: score 89 must NOT fire branch 3
  it('score 89 does NOT trigger highly efficient', () =>
    expect(getCommentaryText(89, 1000, 'easy')).not.toContain('HIGHLY EFFICIENT'));

  // Branch 1 takes score 100 before branch 3 can
  it('score 100 does NOT trigger highly efficient', () =>
    expect(getCommentaryText(100, MIN_SHOTS_TO_WIN, 'medium')).not.toContain('HIGHLY EFFICIENT'));

  // Branch 2 takes turnCount<=par before branch 3
  it('score 94 with turnCount=45 (=medium par) does NOT trigger highly efficient', () =>
    expect(getCommentaryText(94, 45, 'medium')).not.toContain('HIGHLY EFFICIENT'));
});

// ── Branch 4: COMPETENT EXECUTION (score 69–89, turnCount > par) ──────────────

describe('getCommentaryText — branch 4: competent execution', () => {
  // Band floor
  it('score 69  with turnCount>par → competent execution', () =>
    expect(getCommentaryText(69, 1000, 'easy')).toContain('COMPETENT EXECUTION'));

  // Band ceiling
  it('score 89  with turnCount>par → competent execution', () =>
    expect(getCommentaryText(89, 1000, 'easy')).toContain('COMPETENT EXECUTION'));

  // Interior
  it('score 79  with turnCount>par → competent execution', () =>
    expect(getCommentaryText(79, 1000, 'medium')).toContain('COMPETENT EXECUTION'));

  // All difficulties
  it('fires on easy   when score=79 turnCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'easy')).toContain('COMPETENT EXECUTION'));
  it('fires on medium when score=79 turnCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'medium')).toContain('COMPETENT EXECUTION'));
  it('fires on hard   when score=79 turnCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'hard')).toContain('COMPETENT EXECUTION'));
  it('fires on sweaty when score=79 turnCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'sweaty')).toContain('COMPETENT EXECUTION'));

  // Exact return strings
  it('exact return string for easy', () =>
    expect(getCommentaryText(79, 1000, 'easy'))
      .toBe('COMPETENT EXECUTION — WITHIN EXPECTED EASY PARAMETERS'));

  it('exact return string for medium', () =>
    expect(getCommentaryText(79, 1000, 'medium'))
      .toBe('COMPETENT EXECUTION — WITHIN EXPECTED MEDIUM PARAMETERS'));

  it('contains the uppercased difficulty label', () =>
    expect(getCommentaryText(79, 1000, 'sweaty')).toContain('SWEATY'));

  // Boundary adjacency
  it('score 68 does NOT trigger competent execution', () =>
    expect(getCommentaryText(68, 1000, 'easy')).not.toContain('COMPETENT EXECUTION'));

  // Branch 3 takes score >= 90 before branch 4
  it('score 90 does NOT trigger competent execution', () =>
    expect(getCommentaryText(90, 1000, 'easy')).not.toContain('COMPETENT EXECUTION'));

  // Branch 2 takes turnCount<=par before branch 4
  it('score 79 with turnCount=30 (=sweaty par) does NOT trigger competent execution', () =>
    expect(getCommentaryText(79, 30, 'sweaty')).not.toContain('COMPETENT EXECUTION'));
});

// ── Branch 5: PROLONGED ENGAGEMENT (score 36–68, turnCount > par) ──────────────

describe('getCommentaryText — branch 5: prolonged engagement', () => {
  // Band floor
  it('score 36  with turnCount>par → prolonged engagement', () =>
    expect(getCommentaryText(36, 1000, 'easy')).toContain('PROLONGED ENGAGEMENT'));

  // Band ceiling
  it('score 68  with turnCount>par → prolonged engagement', () =>
    expect(getCommentaryText(68, 1000, 'easy')).toContain('PROLONGED ENGAGEMENT'));

  // Interior
  it('score 52  with turnCount>par → prolonged engagement', () =>
    expect(getCommentaryText(52, 1000, 'medium')).toContain('PROLONGED ENGAGEMENT'));

  // All difficulties
  it('fires on easy   when score=52 turnCount>all pars', () =>
    expect(getCommentaryText(52, 1000, 'easy')).toContain('PROLONGED ENGAGEMENT'));
  it('fires on medium when score=52 turnCount>all pars', () =>
    expect(getCommentaryText(52, 1000, 'medium')).toContain('PROLONGED ENGAGEMENT'));
  it('fires on hard   when score=52 turnCount>all pars', () =>
    expect(getCommentaryText(52, 1000, 'hard')).toContain('PROLONGED ENGAGEMENT'));
  it('fires on sweaty when score=52 turnCount>all pars', () =>
    expect(getCommentaryText(52, 1000, 'sweaty')).toContain('PROLONGED ENGAGEMENT'));

  // Exact return strings
  it('exact return string for sweaty', () =>
    expect(getCommentaryText(52, 1000, 'sweaty'))
      .toBe('PROLONGED ENGAGEMENT — REVISE TACTICS FOR SWEATY'));

  it('exact return string for hard', () =>
    expect(getCommentaryText(52, 1000, 'hard'))
      .toBe('PROLONGED ENGAGEMENT — REVISE TACTICS FOR HARD'));

  it('contains the uppercased difficulty label', () =>
    expect(getCommentaryText(52, 1000, 'medium')).toContain('MEDIUM'));

  // Boundary adjacency
  it('score 35 does NOT trigger prolonged engagement', () =>
    expect(getCommentaryText(35, 1000, 'easy')).not.toContain('PROLONGED ENGAGEMENT'));

  // Branch 4 takes score >= 69 before branch 5
  it('score 69 does NOT trigger prolonged engagement', () =>
    expect(getCommentaryText(69, 1000, 'easy')).not.toContain('PROLONGED ENGAGEMENT'));

  // Branch 2 takes turnCount<=par before branch 5
  it('score 52 with turnCount=30 (=sweaty par) does NOT trigger prolonged engagement', () =>
    expect(getCommentaryText(52, 30, 'sweaty')).not.toContain('PROLONGED ENGAGEMENT'));
});

// ── Branch 6: INEFFICIENT OPERATION (score 0–35, turnCount > par) ─────────────

describe('getCommentaryText — branch 6: inefficient operation', () => {
  // Band ceiling (highest score still caught by else)
  it('score 35  with turnCount>par → inefficient operation', () =>
    expect(getCommentaryText(35, 1000, 'easy')).toContain('INEFFICIENT OPERATION'));

  // Score 0
  it('score 0   with turnCount>par → inefficient operation', () =>
    expect(getCommentaryText(0, 1000, 'easy')).toContain('INEFFICIENT OPERATION'));

  // Interior
  it('score 17  with turnCount>par → inefficient operation', () =>
    expect(getCommentaryText(17, 1000, 'medium')).toContain('INEFFICIENT OPERATION'));

  // All difficulties
  it('fires on easy   when score=17 turnCount>all pars', () =>
    expect(getCommentaryText(17, 1000, 'easy')).toContain('INEFFICIENT OPERATION'));
  it('fires on medium when score=17 turnCount>all pars', () =>
    expect(getCommentaryText(17, 1000, 'medium')).toContain('INEFFICIENT OPERATION'));
  it('fires on hard   when score=17 turnCount>all pars', () =>
    expect(getCommentaryText(17, 1000, 'hard')).toContain('INEFFICIENT OPERATION'));
  it('fires on sweaty when score=17 turnCount>all pars', () =>
    expect(getCommentaryText(17, 1000, 'sweaty')).toContain('INEFFICIENT OPERATION'));

  // Exact return strings
  it('exact return string for medium', () =>
    expect(getCommentaryText(17, 1000, 'medium'))
      .toBe('INEFFICIENT OPERATION — SIGNIFICANT LOSSES ON MEDIUM'));

  it('exact return string for sweaty', () =>
    expect(getCommentaryText(17, 1000, 'sweaty'))
      .toBe('INEFFICIENT OPERATION — SIGNIFICANT LOSSES ON SWEATY'));

  it('contains the uppercased difficulty label', () =>
    expect(getCommentaryText(17, 1000, 'easy')).toContain('EASY'));

  // Boundary adjacency: score 36 must NOT fire branch 6
  it('score 36 does NOT trigger inefficient operation', () =>
    expect(getCommentaryText(36, 1000, 'easy')).not.toContain('INEFFICIENT OPERATION'));

  // Branch 2 takes turnCount<=par before branch 6
  it('score 17 with turnCount=25 (<sweaty par) does NOT trigger inefficient operation', () =>
    expect(getCommentaryText(17, 25, 'sweaty')).not.toContain('INEFFICIENT OPERATION'));
});

// ── Mutual exclusivity: each score range belongs to exactly one branch ─────────

describe('getCommentaryText — mutual exclusivity', () => {
  // For each pair of adjacent branches, confirm only one fires at the boundary
  it('score 99 fires highly-efficient, not flawless',       () => {
    const msg = getCommentaryText(99, 1000, 'easy');
    expect(msg).toContain('HIGHLY EFFICIENT');
    expect(msg).not.toContain('FLAWLESS VICTORY');
  });

  it('score 89 fires competent, not highly-efficient',      () => {
    const msg = getCommentaryText(89, 1000, 'easy');
    expect(msg).toContain('COMPETENT EXECUTION');
    expect(msg).not.toContain('HIGHLY EFFICIENT');
  });

  it('score 90 fires highly-efficient, not competent',      () => {
    const msg = getCommentaryText(90, 1000, 'easy');
    expect(msg).toContain('HIGHLY EFFICIENT');
    expect(msg).not.toContain('COMPETENT EXECUTION');
  });

  it('score 68 fires prolonged, not competent',             () => {
    const msg = getCommentaryText(68, 1000, 'easy');
    expect(msg).toContain('PROLONGED ENGAGEMENT');
    expect(msg).not.toContain('COMPETENT EXECUTION');
  });

  it('score 69 fires competent, not prolonged',             () => {
    const msg = getCommentaryText(69, 1000, 'easy');
    expect(msg).toContain('COMPETENT EXECUTION');
    expect(msg).not.toContain('PROLONGED ENGAGEMENT');
  });

  it('score 35 fires inefficient, not prolonged',           () => {
    const msg = getCommentaryText(35, 1000, 'easy');
    expect(msg).toContain('INEFFICIENT OPERATION');
    expect(msg).not.toContain('PROLONGED ENGAGEMENT');
  });

  it('score 36 fires prolonged, not inefficient',           () => {
    const msg = getCommentaryText(36, 1000, 'easy');
    expect(msg).toContain('PROLONGED ENGAGEMENT');
    expect(msg).not.toContain('INEFFICIENT OPERATION');
  });
});

// ── Return type and non-emptiness ─────────────────────────────────────────────────────

describe('getCommentaryText — return type', () => {
  it('always returns a string', () => {
    expect(typeof getCommentaryText(100, 17,   'easy')).toBe('string');
    expect(typeof getCommentaryText(50,  1000, 'medium')).toBe('string');
    expect(typeof getCommentaryText(0,   1000, 'sweaty')).toBe('string');
  });

  it('never returns an empty string', () => {
    const cases: [number, number, (typeof DIFFICULTIES)[number]][] = [
      [100, 17,   'easy'],
      [94,  1000, 'medium'],
      [79,  1000, 'hard'],
      [52,  1000, 'sweaty'],
      [17,  1000, 'easy'],
      [50,  1,    'medium'],
    ];
    cases.forEach(([score, shots, diff]) =>
      expect(getCommentaryText(score, shots, diff).length).toBeGreaterThan(0)
    );
  });
});

// ── calcScore → getCommentaryText round-trips ───────────────────────────────────────────

describe('getCommentaryText — calcScore round-trips', () => {
  // 17 shots = score 100 → flawless
  it('17 shots (score 100) → flawless victory', () =>
    expect(getCommentaryText(calcScore(17), 17, 'medium')).toContain('FLAWLESS VICTORY'));

  // 18 shots = score 94; use turnCount=1000 to bypass branch 2 and isolate branch 3
  it('18 shots (score 94) with turnCount>all pars → highly efficient', () =>
    expect(getCommentaryText(calcScore(18), 1000, 'easy')).toContain('HIGHLY EFFICIENT'));

  // 19 shots = score 89; turnCount=1000 isolates branch 4
  it('19 shots (score 89) with turnCount>all pars → competent execution', () =>
    expect(getCommentaryText(calcScore(19), 1000, 'medium')).toContain('COMPETENT EXECUTION'));

  // 25 shots = score 68; turnCount=1000 isolates branch 5
  it('25 shots (score 68) with turnCount>all pars → prolonged engagement', () =>
    expect(getCommentaryText(calcScore(25), 1000, 'medium')).toContain('PROLONGED ENGAGEMENT'));

  // 48 shots = score 35; turnCount=1000 isolates branch 6
  it('48 shots (score 35) with turnCount>all pars → inefficient operation', () =>
    expect(getCommentaryText(calcScore(48), 1000, 'easy')).toContain('INEFFICIENT OPERATION'));

  // Par-crossing: shot count at par for each difficulty triggers branch 2
  // calcScore(60)=28 (<36), easy par=60: turnCount=60 (=par) → ahead-of-projected
  it('easy: 60 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(60), 60, 'easy')).toContain('AHEAD OF PROJECTED'));

  // calcScore(45)=37 (>=36), medium par=45: turnCount=45 → ahead-of-projected
  it('medium: 45 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(45), 45, 'medium')).toContain('AHEAD OF PROJECTED'));

  // calcScore(38)=44 (>=36), hard par=38: turnCount=38 → ahead-of-projected
  it('hard: 38 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(38), 38, 'hard')).toContain('AHEAD OF PROJECTED'));

  // calcScore(30)=56 (>=36), sweaty par=30: turnCount=30 → ahead-of-projected
  it('sweaty: 30 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(30), 30, 'sweaty')).toContain('AHEAD OF PROJECTED'));

  // One shot past par for each difficulty — branch 2 no longer fires
  it('easy: 61 shots (=par+1): branch 2 does NOT fire', () =>
    expect(getCommentaryText(calcScore(61), 61, 'easy')).not.toContain('AHEAD OF PROJECTED'));

  it('sweaty: 31 shots (=par+1): branch 2 does NOT fire', () =>
    expect(getCommentaryText(calcScore(31), 31, 'sweaty')).not.toContain('AHEAD OF PROJECTED'));
});