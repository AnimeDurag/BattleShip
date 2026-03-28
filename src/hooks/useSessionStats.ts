import { useState, useCallback } from 'react';
import { calcScore } from '../utils/scoring';
import type { Difficulty } from '../models/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionStats {
  gamesPlayed:    number;
  wins:           number;
  losses:         number;
  totalShots:     number;   // across all games, for avg calculation
  bestScore:      number | null;  // best performance % (victories only)
  winStreak:      number;   // current consecutive wins
  bestWinStreak:  number;   // best streak this session
}

export interface GameResult {
  winner:     'player' | 'opponent';
  shotCount:  number;   // player shots fired — used by calcScore and totalShots
  difficulty: Difficulty;
}

// ─── Initial state factory ────────────────────────────────────────────────────

export function initialSessionStats(): SessionStats {
  return {
    gamesPlayed:   0,
    wins:          0,
    losses:        0,
    totalShots:    0,
    bestScore:     null,
    winStreak:     0,
    bestWinStreak: 0,
  };
}

// ─── Pure reducer ─────────────────────────────────────────────────────────────
// Exported so it can be unit-tested without a React environment.

export function applyResult(stats: SessionStats, result: GameResult): SessionStats {
  const isWin   = result.winner === 'player';
  const score   = isWin ? calcScore(result.shotCount) : null;

  const newStreak     = isWin ? stats.winStreak + 1 : 0;
  const newBestStreak = Math.max(stats.bestWinStreak, newStreak);
  const newBestScore  = score === null
    ? stats.bestScore
    : stats.bestScore === null
      ? score
      : Math.max(stats.bestScore, score);

  return {
    gamesPlayed:   stats.gamesPlayed   + 1,
    wins:          stats.wins          + (isWin ? 1 : 0),
    losses:        stats.losses        + (isWin ? 0 : 1),
    totalShots:    stats.totalShots    + result.shotCount,
    bestScore:     newBestScore,
    winStreak:     newStreak,
    bestWinStreak: newBestStreak,
  };
}

// ─── Derived helpers ──────────────────────────────────────────────────────────
// Pure functions, not stored in state — compute on render.

export function winRate(stats: SessionStats): number | null {
  return stats.gamesPlayed === 0
    ? null
    : Math.round((stats.wins / stats.gamesPlayed) * 100);
}

export function avgShots(stats: SessionStats): number | null {
  return stats.gamesPlayed === 0
    ? null
    : Math.round(stats.totalShots / stats.gamesPlayed);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionStats() {
  const [stats, setStats] = useState<SessionStats>(initialSessionStats);

  const recordResult = useCallback((result: GameResult) => {
    setStats(prev => applyResult(prev, result));
  }, []);

  const resetStats = useCallback(() => {
    setStats(initialSessionStats());
  }, []);

  return { stats, recordResult, resetStats };
}