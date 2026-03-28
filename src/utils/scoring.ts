import { FLEET } from './constants';
import type { Difficulty } from '../models/types';

// ─── Constants ────────────────────────────────────────────────────────────────

// The absolute minimum shots a player needs to win: one shot per ship cell.
// With the standard fleet (5+4+3+3+2) this is always 17.
export const MIN_SHOTS_TO_WIN = FLEET.reduce((sum, f) => sum + f.size, 0);

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
 * Maps a shot count to a 0–100 performance score.
 *
 * Formula: floor( MIN_SHOTS_TO_WIN / shotsFired * 100 ), clamped to [0, 100].
 * Using floor (not round) means a player must genuinely reach MIN_SHOTS to
 * score 100 — one extra shot drops them to 99 and into Admiral territory.
 *
 * @param shotsFired  Total shots the player fired during the victorious game.
 *                    Must be >= MIN_SHOTS_TO_WIN for a meaningful result.
 */
export function calcScore(shotsFired: number): number {
  if (shotsFired <= 0) return 0;
  const raw = (MIN_SHOTS_TO_WIN / shotsFired) * 100;
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

// Expected shot counts representing "competent play" at each difficulty tier.
// Used by the post-game screen to contextualise the score: a score of 75%
// against SWEATY deserves more commentary than the same score on EASY.
export const DIFFICULTY_PAR: Record<Difficulty, number> = {
  easy:   60,  // no hunting pattern — expect 50–70 shots to win
  medium: 45,  // systematic sweep finds ships reliably in ~40–55 shots
  hard:   38,  // density-weighted hunt narrows it to ~32–44
  sweaty: 30,  // probability density is near-optimal — expect ~26–34
};

// ─── Post-game commentary ─────────────────────────────────────────────────────

/**
 * Returns a single-line debrief message shown beneath the score bar.
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