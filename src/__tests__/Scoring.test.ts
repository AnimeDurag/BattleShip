/**
 * scoring.ts unit tests
 *
 * All functions under test are pure — no mocking required.
 *
 * New scoring system (v1.2):
 *   score = floor( SCORING_BASELINE × 100 × DIFFICULTY_MULTIPLIER[diff] / shots )
 *           clamped to [0, 100]
 *
 *   SCORING_BASELINE = 24  (strong-human-play reference; replaces MIN_SHOTS_TO_WIN)
 *   Multipliers: easy×1.00  medium×1.15  hard×1.30  sweaty×1.50
 *
 * Rank thresholds (unchanged):
 *   General 100  |  Admiral 90–99  |  Captain 69–89  |  Sergeant 36–68  |  Private 0–35
 *
 * General window (shots that score exactly 100) per difficulty:
 *   Easy ≤24  |  Medium ≤27  |  Hard ≤31  |  Sweaty ≤36
 *
 * Par values: easy=60  medium=45  hard=40  sweaty=38
 *   calcScore(par, diff): easy→40  medium→61  hard→78  sweaty→94  (all < 100)
 */

import {
  MIN_SHOTS_TO_WIN,
  SCORING_BASELINE,
  DIFFICULTY_MULTIPLIER,
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

// ─── SCORING_BASELINE ────────────────────────────────────────────────────────

describe('SCORING_BASELINE', () => {
  it('is 24', () => {
    expect(SCORING_BASELINE).toBe(24);
  });

  it('is greater than MIN_SHOTS_TO_WIN', () => {
    expect(SCORING_BASELINE).toBeGreaterThan(MIN_SHOTS_TO_WIN);
  });

  it('is a positive integer', () => {
    expect(SCORING_BASELINE).toBeGreaterThan(0);
    expect(Number.isInteger(SCORING_BASELINE)).toBe(true);
  });
});

// ─── DIFFICULTY_MULTIPLIER ───────────────────────────────────────────────────

describe('DIFFICULTY_MULTIPLIER', () => {
  it('has an entry for every difficulty', () => {
    DIFFICULTIES.forEach(d => {
      expect(DIFFICULTY_MULTIPLIER[d]).toBeDefined();
    });
  });

  it('easy multiplier is 1.00 (baseline)', () => {
    expect(DIFFICULTY_MULTIPLIER['easy']).toBe(1.00);
  });

  it('harder difficulties have a strictly higher multiplier than easier ones', () => {
    expect(DIFFICULTY_MULTIPLIER['medium']).toBeGreaterThan(DIFFICULTY_MULTIPLIER['easy']);
    expect(DIFFICULTY_MULTIPLIER['hard']).toBeGreaterThan(DIFFICULTY_MULTIPLIER['medium']);
    expect(DIFFICULTY_MULTIPLIER['sweaty']).toBeGreaterThan(DIFFICULTY_MULTIPLIER['hard']);
  });

  it('all multipliers are positive numbers', () => {
    DIFFICULTIES.forEach(d => {
      expect(DIFFICULTY_MULTIPLIER[d]).toBeGreaterThan(0);
    });
  });
});

// ─── calcScore ────────────────────────────────────────────────────────────────

describe('calcScore — zero and negative guards', () => {
  it('returns 0 for a shot count of 0', () => {
    expect(calcScore(0, 'easy')).toBe(0);
  });

  it('returns 0 for negative shot counts', () => {
    expect(calcScore(-5, 'easy')).toBe(0);
    expect(calcScore(-1, 'sweaty')).toBe(0);
  });
});

describe('calcScore — clamping', () => {
  it('never returns a value above 100', () => {
    // Any shot count below SCORING_BASELINE clamps to 100
    expect(calcScore(1, 'easy')).toBe(100);
    expect(calcScore(1, 'sweaty')).toBe(100);
    expect(calcScore(MIN_SHOTS_TO_WIN, 'sweaty')).toBe(100);
  });

  it('never returns a value below 0', () => {
    expect(calcScore(10000, 'easy')).toBeGreaterThanOrEqual(0);
    expect(calcScore(10000, 'sweaty')).toBeGreaterThanOrEqual(0);
  });
});

describe('calcScore — integer output', () => {
  it('always produces an integer result', () => {
    const cases: [number, (typeof DIFFICULTIES)[number]][] = [
      [17,'easy'],[24,'easy'],[25,'easy'],[30,'medium'],[35,'hard'],[40,'sweaty'],
    ];
    cases.forEach(([shots, diff]) => {
      expect(Number.isInteger(calcScore(shots, diff))).toBe(true);
    });
  });
});

describe('calcScore — monotonically non-increasing', () => {
  it('more shots → equal or lower score (easy)', () => {
    for (let i = SCORING_BASELINE; i < SCORING_BASELINE + 60; i++) {
      expect(calcScore(i + 1, 'easy')).toBeLessThanOrEqual(calcScore(i, 'easy'));
    }
  });

  it('more shots → equal or lower score (sweaty)', () => {
    for (let i = SCORING_BASELINE; i < SCORING_BASELINE + 80; i++) {
      expect(calcScore(i + 1, 'sweaty')).toBeLessThanOrEqual(calcScore(i, 'sweaty'));
    }
  });
});

describe('calcScore — difficulty multiplier effect', () => {
  it('same shot count scores higher on harder difficulties', () => {
    // Use 37 shots — above the sweaty General window (≤36), so no clamping occurs
    // and every tier is strictly greater than the one below it.
    // easy=64  medium=74  hard=84  sweaty=97
    const shots = 37;
    expect(calcScore(shots, 'medium')).toBeGreaterThan(calcScore(shots, 'easy'));
    expect(calcScore(shots, 'hard')).toBeGreaterThan(calcScore(shots, 'medium'));
    expect(calcScore(shots, 'sweaty')).toBeGreaterThan(calcScore(shots, 'hard'));
  });

  it('easy at SCORING_BASELINE scores 100 (general)', () => {
    expect(calcScore(SCORING_BASELINE, 'easy')).toBe(100);
  });

  it('easy at SCORING_BASELINE+1 scores below 100 (admiral)', () => {
    expect(calcScore(SCORING_BASELINE + 1, 'easy')).toBeLessThan(100);
    expect(calcScore(SCORING_BASELINE + 1, 'easy')).toBeGreaterThanOrEqual(90);
  });

  it('medium general window extends further than easy', () => {
    // 27 shots: easy→100 (general), medium→100 (general) — medium window ≥ easy
    expect(calcScore(27, 'medium')).toBe(100);
    expect(calcScore(27, 'easy')).toBe(88); // captain on easy
  });

  it('sweaty general window is the widest (≤36 shots)', () => {
    expect(calcScore(36, 'sweaty')).toBe(100);
    expect(calcScore(37, 'sweaty')).toBeLessThan(100);
  });
});

describe('calcScore — Easy spot-checks at rank boundaries', () => {
  // General (score = 100): ≤ 24 shots
  it('24 shots scores 100 — general (easy baseline)', () => {
    expect(calcScore(24, 'easy')).toBe(100);
  });

  // Admiral top (score = 96): 25 shots
  it('25 shots scores 96 — top of admiral band', () => {
    expect(calcScore(25, 'easy')).toBe(96);
  });

  // Admiral (score = 92): 26 shots
  it('26 shots scores 92 — admiral band', () => {
    expect(calcScore(26, 'easy')).toBe(92);
  });

  // Captain top (score = 88): 27 shots
  it('27 shots scores 88 — top of captain band', () => {
    expect(calcScore(27, 'easy')).toBe(88);
  });

  // Captain floor (score = 70): 34 shots
  it('34 shots scores 70 — floor of captain band', () => {
    expect(calcScore(34, 'easy')).toBe(70);
  });

  // Sergeant top (score = 68): 35 shots
  it('35 shots scores 68 — top of sergeant band', () => {
    expect(calcScore(35, 'easy')).toBe(68);
  });

  // Sergeant floor (score = 36): 66 shots
  it('66 shots scores 36 — floor of sergeant band', () => {
    expect(calcScore(66, 'easy')).toBe(36);
  });

  // Private top (score = 35): 67 shots
  it('67 shots scores 35 — top of private band', () => {
    expect(calcScore(67, 'easy')).toBe(35);
  });
});

describe('calcScore — Medium spot-checks at rank boundaries', () => {
  it('27 shots scores 100 — medium general ceiling', () => {
    expect(calcScore(27, 'medium')).toBe(100);
  });

  it('28 shots scores 98 — drops to admiral', () => {
    expect(calcScore(28, 'medium')).toBe(98);
  });

  it('31 shots scores 89 — top of captain band', () => {
    expect(calcScore(31, 'medium')).toBe(89);
  });

  it('40 shots scores 69 — floor of captain band', () => {
    expect(calcScore(40, 'medium')).toBe(69);
  });

  it('41 shots scores 67 — top of sergeant band', () => {
    expect(calcScore(41, 'medium')).toBe(67);
  });

  it('77 shots scores 35 — top of private band', () => {
    expect(calcScore(77, 'medium')).toBe(35);
  });
});

describe('calcScore — Hard spot-checks at rank boundaries', () => {
  it('31 shots scores 100 — hard general ceiling', () => {
    expect(calcScore(31, 'hard')).toBe(100);
  });

  it('32 shots scores 97 — drops to admiral', () => {
    expect(calcScore(32, 'hard')).toBe(97);
  });

  it('35 shots scores 89 — top of captain band', () => {
    expect(calcScore(35, 'hard')).toBe(89);
  });

  it('45 shots scores 69 — floor of captain band', () => {
    expect(calcScore(45, 'hard')).toBe(69);
  });

  it('87 shots scores 35 — top of private band', () => {
    expect(calcScore(87, 'hard')).toBe(35);
  });
});

describe('calcScore — Sweaty spot-checks at rank boundaries', () => {
  it('36 shots scores 100 — sweaty general ceiling', () => {
    expect(calcScore(36, 'sweaty')).toBe(100);
  });

  it('37 shots scores 97 — drops to admiral', () => {
    expect(calcScore(37, 'sweaty')).toBe(97);
  });

  it('40 shots scores 90 — floor of admiral band', () => {
    expect(calcScore(40, 'sweaty')).toBe(90);
  });

  it('41 shots scores 87 — top of captain band', () => {
    expect(calcScore(41, 'sweaty')).toBe(87);
  });

  it('52 shots scores 69 — floor of captain band', () => {
    expect(calcScore(52, 'sweaty')).toBe(69);
  });

  it('53 shots scores 67 — top of sergeant band', () => {
    expect(calcScore(53, 'sweaty')).toBe(67);
  });

  it('100 shots scores 36 — floor of sergeant band', () => {
    expect(calcScore(100, 'sweaty')).toBe(36);
  });

  it('101 shots scores 35 — top of private band', () => {
    expect(calcScore(101, 'sweaty')).toBe(35);
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

describe('getRank — lower band boundaries', () => {
  it('score 0   → private  (band floor)', () => expect(getRank(0).tier).toBe('private'));
  it('score 36  → sergeant (band floor)', () => expect(getRank(36).tier).toBe('sergeant'));
  it('score 69  → captain  (band floor)', () => expect(getRank(69).tier).toBe('captain'));
  it('score 90  → admiral  (band floor)', () => expect(getRank(90).tier).toBe('admiral'));
  it('score 100 → general  (band floor)', () => expect(getRank(100).tier).toBe('general'));
});

describe('getRank — upper band boundaries', () => {
  it('score 35  → private  (band ceiling)', () => expect(getRank(35).tier).toBe('private'));
  it('score 68  → sergeant (band ceiling)', () => expect(getRank(68).tier).toBe('sergeant'));
  it('score 89  → captain  (band ceiling)', () => expect(getRank(89).tier).toBe('captain'));
  it('score 99  → admiral  (band ceiling)', () => expect(getRank(99).tier).toBe('admiral'));
  it('score 100 → general  (only value)',   () => expect(getRank(100).tier).toBe('general'));
});

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

describe('getRank — interior scores within each band', () => {
  it('score 17  → private  (midpoint of 0–35)',  () => expect(getRank(17).tier).toBe('private'));
  it('score 52  → sergeant (midpoint of 36–68)', () => expect(getRank(52).tier).toBe('sergeant'));
  it('score 79  → captain  (midpoint of 69–89)', () => expect(getRank(79).tier).toBe('captain'));
  it('score 94  → admiral  (interior of 90–99)', () => expect(getRank(94).tier).toBe('admiral'));
});

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

describe('getRank — out-of-domain inputs', () => {
  it('score -1   → private (loop fallback)',   () => expect(getRank(-1).tier).toBe('private'));
  it('score -100 → private (loop fallback)',   () => expect(getRank(-100).tier).toBe('private'));
  it('score 101  → general', () => expect(getRank(101).tier).toBe('general'));
  it('score 200  → general', () => expect(getRank(200).tier).toBe('general'));
});

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
    expect(getRank(10)).toBe(getRank(11));   // both private
    expect(getRank(50)).toBe(getRank(51));   // both sergeant
    expect(getRank(75)).toBe(getRank(76));   // both captain
    expect(getRank(92)).toBe(getRank(93));   // both admiral
  });
});

describe('getRank — calcScore round-trips (Easy baseline)', () => {
  // General window: ≤24 shots on easy
  it('24 shots (score 100) → general',  () => expect(getRank(calcScore(24, 'easy')).tier).toBe('general'));
  // Admiral: 25–26 shots on easy
  it('25 shots (score 96)  → admiral',  () => expect(getRank(calcScore(25, 'easy')).tier).toBe('admiral'));
  it('26 shots (score 92)  → admiral',  () => expect(getRank(calcScore(26, 'easy')).tier).toBe('admiral'));
  // Captain: 27–34 shots on easy
  it('27 shots (score 88)  → captain',  () => expect(getRank(calcScore(27, 'easy')).tier).toBe('captain'));
  it('30 shots (score 80)  → captain',  () => expect(getRank(calcScore(30, 'easy')).tier).toBe('captain'));
  it('34 shots (score 70)  → captain',  () => expect(getRank(calcScore(34, 'easy')).tier).toBe('captain'));
  // Sergeant: 35–66 shots on easy
  it('35 shots (score 68)  → sergeant', () => expect(getRank(calcScore(35, 'easy')).tier).toBe('sergeant'));
  it('50 shots (score 48)  → sergeant', () => expect(getRank(calcScore(50, 'easy')).tier).toBe('sergeant'));
  // Private: 67+ shots on easy
  it('67 shots (score 35)  → private',  () => expect(getRank(calcScore(67, 'easy')).tier).toBe('private'));
  it('80 shots (score 30)  → private',  () => expect(getRank(calcScore(80, 'easy')).tier).toBe('private'));

  it('one extra shot past a boundary never bleeds into the higher band', () => {
    // 27 shots = 88 (captain ceiling) — must NOT be admiral
    expect(getRank(calcScore(27, 'easy')).tier).not.toBe('admiral');
    // 35 shots = 68 (sergeant ceiling) — must NOT be captain
    expect(getRank(calcScore(35, 'easy')).tier).not.toBe('captain');
    // 67 shots = 35 (private ceiling) — must NOT be sergeant
    expect(getRank(calcScore(67, 'easy')).tier).not.toBe('sergeant');
  });
});

describe('getRank — calcScore round-trips (harder difficulties)', () => {
  it('27 shots on medium → general (medium window extends past easy)', () => {
    expect(getRank(calcScore(27, 'medium')).tier).toBe('general');
    expect(getRank(calcScore(27, 'easy')).tier).toBe('captain');
  });

  it('31 shots on hard → general', () => {
    expect(getRank(calcScore(31, 'hard')).tier).toBe('general');
  });

  it('36 shots on sweaty → general', () => {
    expect(getRank(calcScore(36, 'sweaty')).tier).toBe('general');
  });

  it('37 shots on sweaty → admiral (just outside general window)', () => {
    expect(getRank(calcScore(37, 'sweaty')).tier).toBe('admiral');
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

  it('calcScore at par is always < 100 — branch 2 and branch 1 stay mutually exclusive', () => {
    DIFFICULTIES.forEach(d => {
      expect(calcScore(DIFFICULTY_PAR[d], d)).toBeLessThan(100);
    });
  });

  it('easy par=60, medium par=45, hard par=40, sweaty par=38', () => {
    expect(DIFFICULTY_PAR['easy']).toBe(60);
    expect(DIFFICULTY_PAR['medium']).toBe(45);
    expect(DIFFICULTY_PAR['hard']).toBe(40);
    expect(DIFFICULTY_PAR['sweaty']).toBe(38);
  });
});


// ─── getCommentaryText ────────────────────────────────────────────────────────
//
// Branch map (evaluated top-to-bottom; first match wins):
//   1. score === 100                     → FLAWLESS VICTORY
//   2. shotCount <= par[difficulty]      → AHEAD OF PROJECTED
//   3. score >= 90                       → HIGHLY EFFICIENT
//   4. score >= 69                       → COMPETENT EXECUTION
//   5. score >= 36                       → PROLONGED ENGAGEMENT
//   6. else (score 0–35)                 → INEFFICIENT OPERATION
//
// Par values: easy=60  medium=45  hard=40  sweaty=38
//
// calcScore values used in round-trips below:
//   calcScore(17,'medium')=100    calcScore(24,'easy')=100
//   calcScore(39,'sweaty')=92     calcScore(42,'sweaty')=85
//   calcScore(61,'easy')=39       calcScore(67,'easy')=35
//   calcScore(60,'easy')=40       calcScore(45,'medium')=61
//   calcScore(40,'hard')=78       calcScore(38,'sweaty')=94
// ──────────────────────────────────────────────────────────────────────────────

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

  // Priority: branch 1 must win even when shotCount <= par (branch 2 also true)
  it('score 100 with shotCount <= sweaty par (38) → flawless, not ahead-of-projected', () => {
    // MIN_SHOTS_TO_WIN=17 which is <= sweaty par=38, so both branch-1 and branch-2 conditions hold
    const msg = getCommentaryText(100, 17, 'sweaty');
    expect(msg).toContain('FLAWLESS VICTORY');
    expect(msg).not.toContain('AHEAD OF PROJECTED');
  });

  it('score 99 does NOT trigger flawless victory', () =>
    expect(getCommentaryText(99, 1000, 'easy')).not.toContain('FLAWLESS VICTORY'));
});

// ── Branch 2: AHEAD OF PROJECTED (shotCount <= par, score ≠ 100) ─────────────

describe('getCommentaryText — branch 2: ahead of projected', () => {
  it('score 40, shots at easy par (60) → ahead-of-projected', () =>
    expect(getCommentaryText(40, 60, 'easy')).toContain('AHEAD OF PROJECTED'));

  it('score 61, shots at medium par (45) → ahead-of-projected', () =>
    expect(getCommentaryText(61, 45, 'medium')).toContain('AHEAD OF PROJECTED'));

  it('score 78, shots at hard par (40) → ahead-of-projected', () =>
    expect(getCommentaryText(78, 40, 'hard')).toContain('AHEAD OF PROJECTED'));

  it('score 94, shots at sweaty par (38) → ahead-of-projected', () =>
    expect(getCommentaryText(94, 38, 'sweaty')).toContain('AHEAD OF PROJECTED'));

  it('shots below par also triggers (shotCount < par)', () =>
    expect(getCommentaryText(50, 30, 'easy')).toContain('AHEAD OF PROJECTED'));

  it('exact return string for easy', () =>
    expect(getCommentaryText(40, 60, 'easy'))
      .toBe('ENGAGEMENT CONCLUDED AHEAD OF PROJECTED EASY DURATION'));

  it('exact return string for sweaty', () =>
    expect(getCommentaryText(94, 38, 'sweaty'))
      .toBe('ENGAGEMENT CONCLUDED AHEAD OF PROJECTED SWEATY DURATION'));

  it('contains the uppercased difficulty label', () =>
    expect(getCommentaryText(50, 30, 'medium')).toContain('MEDIUM'));

  // Branch 1 takes priority over branch 2
  it('score 100 with shots <= par fires flawless, not ahead-of-projected', () => {
    const msg = getCommentaryText(100, 20, 'easy');
    expect(msg).toContain('FLAWLESS VICTORY');
    expect(msg).not.toContain('AHEAD OF PROJECTED');
  });

  // One shot past par — branch 2 does not fire
  it('shots = par+1 does NOT trigger ahead-of-projected', () => {
    expect(getCommentaryText(50, 61, 'easy')).not.toContain('AHEAD OF PROJECTED');
    expect(getCommentaryText(94, 39, 'sweaty')).not.toContain('AHEAD OF PROJECTED');
  });
});

// ── Branch 3: HIGHLY EFFICIENT (score 90–99, shotCount > par) ────────────────

describe('getCommentaryText — branch 3: highly efficient', () => {
  // Band ceiling
  it('score 99  with shotCount>par → highly efficient', () =>
    expect(getCommentaryText(99, 1000, 'easy')).toContain('HIGHLY EFFICIENT'));

  // Band floor
  it('score 90  with shotCount>par → highly efficient', () =>
    expect(getCommentaryText(90, 1000, 'easy')).toContain('HIGHLY EFFICIENT'));

  // Interior
  it('score 94  with shotCount>par → highly efficient', () =>
    expect(getCommentaryText(94, 1000, 'medium')).toContain('HIGHLY EFFICIENT'));

  // All difficulties
  it('fires on easy   when score=94 shotCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'easy')).toContain('HIGHLY EFFICIENT'));
  it('fires on medium when score=94 shotCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'medium')).toContain('HIGHLY EFFICIENT'));
  it('fires on hard   when score=94 shotCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'hard')).toContain('HIGHLY EFFICIENT'));
  it('fires on sweaty when score=94 shotCount>all pars', () =>
    expect(getCommentaryText(94, 1000, 'sweaty')).toContain('HIGHLY EFFICIENT'));

  // Exact strings
  it('exact return string for easy', () =>
    expect(getCommentaryText(94, 1000, 'easy'))
      .toBe('HIGHLY EFFICIENT OPERATION FOR EASY DIFFICULTY'));

  it('exact return string for sweaty', () =>
    expect(getCommentaryText(94, 1000, 'sweaty'))
      .toBe('HIGHLY EFFICIENT OPERATION FOR SWEATY DIFFICULTY'));

  // Boundary adjacency
  it('score 89 does NOT trigger highly efficient', () =>
    expect(getCommentaryText(89, 1000, 'easy')).not.toContain('HIGHLY EFFICIENT'));

  it('score 100 does NOT trigger highly efficient (branch 1 wins)', () =>
    expect(getCommentaryText(100, 1000, 'easy')).not.toContain('HIGHLY EFFICIENT'));

  // Branch 2 takes priority
  it('score 94 with shotCount<=sweaty par (38) does NOT trigger highly efficient', () =>
    expect(getCommentaryText(94, 38, 'sweaty')).not.toContain('HIGHLY EFFICIENT'));
});

// ── Branch 4: COMPETENT EXECUTION (score 69–89, shotCount > par) ─────────────

describe('getCommentaryText — branch 4: competent execution', () => {
  // Band ceiling
  it('score 89  with shotCount>par → competent execution', () =>
    expect(getCommentaryText(89, 1000, 'easy')).toContain('COMPETENT EXECUTION'));

  // Band floor
  it('score 69  with shotCount>par → competent execution', () =>
    expect(getCommentaryText(69, 1000, 'easy')).toContain('COMPETENT EXECUTION'));

  // Interior
  it('score 79  with shotCount>par → competent execution', () =>
    expect(getCommentaryText(79, 1000, 'medium')).toContain('COMPETENT EXECUTION'));

  // All difficulties
  it('fires on easy   when score=79 shotCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'easy')).toContain('COMPETENT EXECUTION'));
  it('fires on medium when score=79 shotCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'medium')).toContain('COMPETENT EXECUTION'));
  it('fires on hard   when score=79 shotCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'hard')).toContain('COMPETENT EXECUTION'));
  it('fires on sweaty when score=79 shotCount>all pars', () =>
    expect(getCommentaryText(79, 1000, 'sweaty')).toContain('COMPETENT EXECUTION'));

  // Exact strings
  it('exact return string for medium', () =>
    expect(getCommentaryText(79, 1000, 'medium'))
      .toBe('COMPETENT EXECUTION — WITHIN EXPECTED MEDIUM PARAMETERS'));

  it('exact return string for hard', () =>
    expect(getCommentaryText(79, 1000, 'hard'))
      .toBe('COMPETENT EXECUTION — WITHIN EXPECTED HARD PARAMETERS'));

  // Boundary adjacency
  it('score 68 does NOT trigger competent execution', () =>
    expect(getCommentaryText(68, 1000, 'easy')).not.toContain('COMPETENT EXECUTION'));

  it('score 90 does NOT trigger competent execution (branch 3 wins)', () =>
    expect(getCommentaryText(90, 1000, 'easy')).not.toContain('COMPETENT EXECUTION'));

  // Branch 2 takes priority
  it('score 79 with shotCount<=par does NOT trigger competent execution', () =>
    expect(getCommentaryText(79, 30, 'easy')).not.toContain('COMPETENT EXECUTION'));
});

// ── Branch 5: PROLONGED ENGAGEMENT (score 36–68, shotCount > par) ─────────────

describe('getCommentaryText — branch 5: prolonged engagement', () => {
  // Band ceiling
  it('score 68  with shotCount>par → prolonged engagement', () =>
    expect(getCommentaryText(68, 1000, 'easy')).toContain('PROLONGED ENGAGEMENT'));

  // Interior
  it('score 52  with shotCount>par → prolonged engagement', () =>
    expect(getCommentaryText(52, 1000, 'medium')).toContain('PROLONGED ENGAGEMENT'));

  // All difficulties
  it('fires on easy   when score=52 shotCount>all pars', () =>
    expect(getCommentaryText(52, 1000, 'easy')).toContain('PROLONGED ENGAGEMENT'));
  it('fires on medium when score=52 shotCount>all pars', () =>
    expect(getCommentaryText(52, 1000, 'medium')).toContain('PROLONGED ENGAGEMENT'));
  it('fires on hard   when score=52 shotCount>all pars', () =>
    expect(getCommentaryText(52, 1000, 'hard')).toContain('PROLONGED ENGAGEMENT'));
  it('fires on sweaty when score=52 shotCount>all pars', () =>
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

  it('score 69 does NOT trigger prolonged engagement (branch 4 wins)', () =>
    expect(getCommentaryText(69, 1000, 'easy')).not.toContain('PROLONGED ENGAGEMENT'));

  // Branch 2 takes priority — sweaty par is now 38
  it('score 52 with shotCount=30 (< sweaty par 38) does NOT trigger prolonged engagement', () =>
    expect(getCommentaryText(52, 30, 'sweaty')).not.toContain('PROLONGED ENGAGEMENT'));
});

// ── Branch 6: INEFFICIENT OPERATION (score 0–35, shotCount > par) ─────────────

describe('getCommentaryText — branch 6: inefficient operation', () => {
  // Band ceiling
  it('score 35  with shotCount>par → inefficient operation', () =>
    expect(getCommentaryText(35, 1000, 'easy')).toContain('INEFFICIENT OPERATION'));

  // Score 0
  it('score 0   with shotCount>par → inefficient operation', () =>
    expect(getCommentaryText(0, 1000, 'easy')).toContain('INEFFICIENT OPERATION'));

  // Interior
  it('score 17  with shotCount>par → inefficient operation', () =>
    expect(getCommentaryText(17, 1000, 'medium')).toContain('INEFFICIENT OPERATION'));

  // All difficulties
  it('fires on easy   when score=17 shotCount>all pars', () =>
    expect(getCommentaryText(17, 1000, 'easy')).toContain('INEFFICIENT OPERATION'));
  it('fires on medium when score=17 shotCount>all pars', () =>
    expect(getCommentaryText(17, 1000, 'medium')).toContain('INEFFICIENT OPERATION'));
  it('fires on hard   when score=17 shotCount>all pars', () =>
    expect(getCommentaryText(17, 1000, 'hard')).toContain('INEFFICIENT OPERATION'));
  it('fires on sweaty when score=17 shotCount>all pars', () =>
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

  // Branch 2 takes priority — sweaty par is 38, so 25 < 38 triggers ahead-of-projected
  it('score 17 with shotCount=25 (< sweaty par 38) does NOT trigger inefficient operation', () =>
    expect(getCommentaryText(17, 25, 'sweaty')).not.toContain('INEFFICIENT OPERATION'));
});

// ── Mutual exclusivity ────────────────────────────────────────────────────────

describe('getCommentaryText — mutual exclusivity', () => {
  it('score 99 fires highly-efficient, not flawless', () => {
    const msg = getCommentaryText(99, 1000, 'easy');
    expect(msg).toContain('HIGHLY EFFICIENT');
    expect(msg).not.toContain('FLAWLESS VICTORY');
  });

  it('score 89 fires competent, not highly-efficient', () => {
    const msg = getCommentaryText(89, 1000, 'easy');
    expect(msg).toContain('COMPETENT EXECUTION');
    expect(msg).not.toContain('HIGHLY EFFICIENT');
  });

  it('score 90 fires highly-efficient, not competent', () => {
    const msg = getCommentaryText(90, 1000, 'easy');
    expect(msg).toContain('HIGHLY EFFICIENT');
    expect(msg).not.toContain('COMPETENT EXECUTION');
  });

  it('score 68 fires prolonged, not competent', () => {
    const msg = getCommentaryText(68, 1000, 'easy');
    expect(msg).toContain('PROLONGED ENGAGEMENT');
    expect(msg).not.toContain('COMPETENT EXECUTION');
  });

  it('score 69 fires competent, not prolonged', () => {
    const msg = getCommentaryText(69, 1000, 'easy');
    expect(msg).toContain('COMPETENT EXECUTION');
    expect(msg).not.toContain('PROLONGED ENGAGEMENT');
  });

  it('score 35 fires inefficient, not prolonged', () => {
    const msg = getCommentaryText(35, 1000, 'easy');
    expect(msg).toContain('INEFFICIENT OPERATION');
    expect(msg).not.toContain('PROLONGED ENGAGEMENT');
  });

  it('score 36 fires prolonged, not inefficient', () => {
    const msg = getCommentaryText(36, 1000, 'easy');
    expect(msg).toContain('PROLONGED ENGAGEMENT');
    expect(msg).not.toContain('INEFFICIENT OPERATION');
  });
});

// ── Return type and non-emptiness ─────────────────────────────────────────────

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

// ── calcScore → getCommentaryText round-trips ─────────────────────────────────

describe('getCommentaryText — calcScore round-trips', () => {
  // Branch 1: 17 shots on medium = score 100 → flawless
  it('17 shots on medium (score 100) → flawless victory', () =>
    expect(getCommentaryText(calcScore(17, 'medium'), 17, 'medium')).toContain('FLAWLESS VICTORY'));

  // Branch 2: shot count at par for each difficulty (all < 100) → ahead-of-projected
  it('easy: 60 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(60, 'easy'), 60, 'easy')).toContain('AHEAD OF PROJECTED'));

  it('medium: 45 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(45, 'medium'), 45, 'medium')).toContain('AHEAD OF PROJECTED'));

  it('hard: 40 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(40, 'hard'), 40, 'hard')).toContain('AHEAD OF PROJECTED'));

  it('sweaty: 38 shots (=par) → ahead-of-projected', () =>
    expect(getCommentaryText(calcScore(38, 'sweaty'), 38, 'sweaty')).toContain('AHEAD OF PROJECTED'));

  // Branch 3: sweaty 39 shots (=par+1) → score 92, past par → highly efficient
  it('sweaty: 39 shots (score 92, past par) → highly efficient', () =>
    expect(getCommentaryText(calcScore(39, 'sweaty'), 39, 'sweaty')).toContain('HIGHLY EFFICIENT'));

  // Branch 4: sweaty 42 shots (past par) → score 85 → competent execution
  it('sweaty: 42 shots (score 85, past par) → competent execution', () =>
    expect(getCommentaryText(calcScore(42, 'sweaty'), 42, 'sweaty')).toContain('COMPETENT EXECUTION'));

  // Branch 5: easy 61 shots (=par+1) → score 39, past par → prolonged engagement
  it('easy: 61 shots (score 39, past par) → prolonged engagement', () =>
    expect(getCommentaryText(calcScore(61, 'easy'), 61, 'easy')).toContain('PROLONGED ENGAGEMENT'));

  // Branch 6: easy 67 shots (past par) → score 35 → inefficient operation
  it('easy: 67 shots (score 35, past par) → inefficient operation', () =>
    expect(getCommentaryText(calcScore(67, 'easy'), 67, 'easy')).toContain('INEFFICIENT OPERATION'));

  // One shot past par — branch 2 no longer fires
  it('easy: 61 shots (=par+1): branch 2 does NOT fire', () =>
    expect(getCommentaryText(calcScore(61, 'easy'), 61, 'easy')).not.toContain('AHEAD OF PROJECTED'));

  it('sweaty: 39 shots (=par+1): branch 2 does NOT fire', () =>
    expect(getCommentaryText(calcScore(39, 'sweaty'), 39, 'sweaty')).not.toContain('AHEAD OF PROJECTED'));
});