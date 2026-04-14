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
  const score   = isWin ? calcScore(result.shotCount, result.difficulty) : null;

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

// ─── PvP stats types ──────────────────────────────────────────────────────────

export interface PvPGameResult {
  winner:    1 | 2;
  p1Shots:   number;
  p2Shots:   number;
  p1Hits:    number;
  p2Hits:    number;
}

export interface PvPSessionStats {
  gamesPlayed:   number;
  p1Wins:        number;
  p2Wins:        number;
  p1TotalShots:  number;
  p2TotalShots:  number;
  p1TotalHits:   number;
  p2TotalHits:   number;
}

export function initialPvPSessionStats(): PvPSessionStats {
  return {
    gamesPlayed:  0,
    p1Wins:       0,
    p2Wins:       0,
    p1TotalShots: 0,
    p2TotalShots: 0,
    p1TotalHits:  0,
    p2TotalHits:  0,
  };
}

export function applyPvPResult(
  stats: PvPSessionStats,
  result: PvPGameResult
): PvPSessionStats {
  return {
    gamesPlayed:   stats.gamesPlayed   + 1,
    p1Wins:        stats.p1Wins        + (result.winner === 1 ? 1 : 0),
    p2Wins:        stats.p2Wins        + (result.winner === 2 ? 1 : 0),
    p1TotalShots:  stats.p1TotalShots  + result.p1Shots,
    p2TotalShots:  stats.p2TotalShots  + result.p2Shots,
    p1TotalHits:   stats.p1TotalHits   + result.p1Hits,
    p2TotalHits:   stats.p2TotalHits   + result.p2Hits,
  };
}

export function p1WinRate(stats: PvPSessionStats): number | null {
  return stats.gamesPlayed === 0
    ? null
    : Math.round((stats.p1Wins / stats.gamesPlayed) * 100);
}

export function p2WinRate(stats: PvPSessionStats): number | null {
  return stats.gamesPlayed === 0
    ? null
    : Math.round((stats.p2Wins / stats.gamesPlayed) * 100);
}

export function p1AvgShots(stats: PvPSessionStats): number | null {
  return stats.gamesPlayed === 0
    ? null
    : Math.round(stats.p1TotalShots / stats.gamesPlayed);
}

export function p2AvgShots(stats: PvPSessionStats): number | null {
  return stats.gamesPlayed === 0
    ? null
    : Math.round(stats.p2TotalShots / stats.gamesPlayed);
}

export function p1Accuracy(stats: PvPSessionStats): number | null {
  return stats.p1TotalShots === 0
    ? null
    : Math.round((stats.p1TotalHits / stats.p1TotalShots) * 100);
}

export function p2Accuracy(stats: PvPSessionStats): number | null {
  return stats.p2TotalShots === 0
    ? null
    : Math.round((stats.p2TotalHits / stats.p2TotalShots) * 100);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionStats() {
  const [stats,    setStats]    = useState<SessionStats>(initialSessionStats);
  const [pvpStats, setPvpStats] = useState<PvPSessionStats>(initialPvPSessionStats);

  const recordResult = useCallback((result: GameResult) => {
    setStats(prev => applyResult(prev, result));
  }, []);

  const recordPvPResult = useCallback((result: PvPGameResult) => {
    setPvpStats(prev => applyPvPResult(prev, result));
  }, []);

  const resetStats = useCallback(() => {
    setStats(initialSessionStats());
    setPvpStats(initialPvPSessionStats());
  }, []);

  return { stats, pvpStats, recordResult, recordPvPResult, resetStats };
}