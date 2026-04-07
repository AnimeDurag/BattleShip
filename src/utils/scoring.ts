import { FLEET } from './constants';
import type { Difficulty } from '../models/types';

// ─── Constants ────────────────────────────────────────────────────────────────

// The absolute minimum shots a player needs to win: one shot per ship cell.
// With the standard fleet (5+4+3+3+2) this is always 17.
export const MIN_SHOTS_TO_WIN = FLEET.reduce((sum, f) => sum + f.size, 0);

// Excellence baseline for scoring. Represents a strong human performance:
// winning with only 7 non-ship search shots above the mathematical minimum.
// On Easy (×1.0) firing exactly SCORING_BASELINE shots earns a perfect 100.
// Harder difficulties apply a multiplier, so the same shot count yields a
// higher score the more skilled the AI is.
//
// Why 24 and not 17: 17 requires perfect foreknowledge of every ship position
// (impossible through honest play). The very first shot of a game is always a
// search shot against a blank board. 24 is achievable by a skilled player and
// distinguishes genuine excellence from a theoretical floor no one can reach.
export const SCORING_BASELINE = 24;

// ─── Difficulty multipliers ───────────────────────────────────────────────────

// Scales calcScore upward on harder difficulties so that a strong performance
// against a near-optimal AI scores meaningfully higher than the same shot count
// against a passive one.
//
// Calibrated so that:
//   Easy  (×1.00) General window : ≤ 24 shots
//   Medium(×1.15) General window : ≤ 27 shots
//   Hard  (×1.30) General window : ≤ 31 shots
//   Sweaty(×1.50) General window : ≤ 36 shots
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy:   1.00,
  medium: 1.15,
  hard:   1.30,
  sweaty: 1.50,
};

// ─── Rank definitions ─────────────────────────────────────────────────────────

export type RankTier = 'private' | 'sergeant' | 'captain' | 'admiral' | 'general';

export interface Rank {
  tier:      RankTier;
  label:     string;
  minScore:  number;   // inclusive lower bound (0–100)
  maxScore:  number;   // inclusive upper bound (0–100)
  cssVar:    string;   // CSS custom-property name for the color token
}

// Ordered low → high so getRank can walk from the top down.
export const RANKS: Rank[] = [
  { tier: 'private',  label: 'PRIVATE',              minScore:   0, maxScore:  35, cssVar: '--dim'   },
  { tier: 'sergeant', label: 'SERGEANT',              minScore:  36, maxScore:  68, cssVar: '--text'  },
  { tier: 'captain',  label: 'CAPTAIN',               minScore:  69, maxScore:  89, cssVar: '--amber' },
  { tier: 'admiral',  label: 'ADMIRAL',               minScore:  90, maxScore:  99, cssVar: '--sunk'  },
  { tier: 'general',  label: 'GENERAL OF THE ARMIES', minScore: 100, maxScore: 100, cssVar: '--green' },
];

// ─── Score calculation ────────────────────────────────────────────────────────

/**
 * Maps a shot count to a 0–100 performance score, weighted by difficulty.
 *
 * Formula: floor( SCORING_BASELINE × 100 × DIFFICULTY_MULTIPLIER[difficulty]
 *                 / shotsFired ),  clamped to [0, 100].
 *
 * Multiplication is performed before division to avoid IEEE 754 float drift
 * (e.g. 24/36 * 100 * 1.5 = 99.999… which floors to 99 — wrong). Reordered
 * as (24 * 100 * 1.5) / 36 = 3600 / 36 = 100 — correct.
 *
 * floor (not round) means the player must hit the exact shot threshold to
 * achieve the next rank — one extra shot stays in the lower band.
 *
 * @param shotsFired  Total shots the player fired during the victorious game.
 * @param difficulty  Difficulty the game was played on — controls the multiplier.
 */
export function calcScore(shotsFired: number, difficulty: Difficulty): number {
  if (shotsFired <= 0) return 0;
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];
  const raw = (SCORING_BASELINE * 100 * multiplier) / shotsFired;
  return Math.min(100, Math.max(0, Math.floor(raw)));
}

// ─── Rank lookup ──────────────────────────────────────────────────────────────

/**
 * Returns the Rank object for a given score (0–100).
 * Always returns a valid rank — falls back to PRIVATE for any score <= 35.
 */
export function getRank(score: number): Rank {
  // Walk from highest to lowest so the first match wins.
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].minScore) return RANKS[i];
  }
  return RANKS[0]; // PRIVATE — unreachable but satisfies the type system
}

// ─── Difficulty par ───────────────────────────────────────────────────────────

// Expected shot counts for "competent play" at each difficulty tier.
// Harder difficulties have a lower par — players who choose them tend to play
// more efficiently, and the multiplier means they score higher for it.
//
// Par is also the branch-2 threshold in getCommentaryText: finishing at or
// below par triggers the "AHEAD OF PROJECTED DURATION" commentary regardless
// of score, rewarding players who beat expectations.
//
// Par values are calibrated so that calcScore(par, difficulty) < 100 — the
// "ahead of schedule" message and the "flawless" message are mutually exclusive.
//
//   Easy   par=60 → score 40 at par  (Private)
//   Medium par=45 → score 61 at par  (Sergeant)
//   Hard   par=40 → score 78 at par  (Captain)
//   Sweaty par=38 → score 94 at par  (Admiral — surviving near-optimal AI well enough to finish here is genuinely impressive)
export const DIFFICULTY_PAR: Record<Difficulty, number> = {
  easy:   60,  // casual play — expect 50–70 shots to win
  medium: 45,  // engaged play — expect 38–55 shots
  hard:   40,  // skilled play — expect 32–48 shots
  sweaty: 38,  // expert play  — expect 30–46 shots; finishing at par earns Admiral
};

// ─── Post-game commentary ─────────────────────────────────────────────────────

/**
 * Returns a single-line debrief message shown beneath the score bar.
 *
 * Branch evaluation order (first match wins):
 *   1. score === 100                 → FLAWLESS VICTORY
 *   2. shotCount <= par[difficulty]  → AHEAD OF PROJECTED DURATION
 *   3. score >= 90                   → HIGHLY EFFICIENT OPERATION
 *   4. score >= 69                   → COMPETENT EXECUTION
 *   5. score >= 36                   → PROLONGED ENGAGEMENT
 *   6. else                          → INEFFICIENT OPERATION
 *
 * Pure function — extracted from GameOver.tsx so it can be unit-tested
 * without a DOM environment.
 *
 * @param score      0-100 performance score from calcScore()
 * @param shotCount  Shots fired in the victorious game
 * @param difficulty Difficulty the game was played on
 */
export function getCommentaryText(
  score: number,
  shotCount: number,
  difficulty: Difficulty
): string {
  const label = difficulty.toUpperCase();
  const par   = DIFFICULTY_PAR[difficulty];

  if (score === 100)        return `FLAWLESS VICTORY — PERFECT ENGAGEMENT ON ${label}`;
  if (shotCount <= par)     return `ENGAGEMENT CONCLUDED AHEAD OF PROJECTED ${label} DURATION`;
  if (score >= 90)          return `HIGHLY EFFICIENT OPERATION FOR ${label} DIFFICULTY`;
  if (score >= 69)          return `COMPETENT EXECUTION — WITHIN EXPECTED ${label} PARAMETERS`;
  if (score >= 36)          return `PROLONGED ENGAGEMENT — REVISE TACTICS FOR ${label}`;
  return                           `INEFFICIENT OPERATION — SIGNIFICANT LOSSES ON ${label}`;
}