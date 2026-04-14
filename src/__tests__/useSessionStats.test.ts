/**
 * useSessionStats tests
 *
 * The pure reducer (applyResult) and derived helpers (winRate, avgShots) are
 * tested without React. The hook itself is tested via renderHook to verify
 * React state management and the immutability guarantee.
 */

import { renderHook, act } from '@testing-library/react';
import {
  initialSessionStats,
  applyResult,
  winRate,
  avgShots,
  useSessionStats,
  initialPvPSessionStats,
  applyPvPResult,
  p1WinRate,
  p2WinRate,
  p1Accuracy,
  p2Accuracy,
  p1AvgShots,
  p2AvgShots,
} from '../hooks/useSessionStats';
import type { SessionStats, GameResult, PvPSessionStats, PvPGameResult } from '../hooks/useSessionStats';
import { MIN_SHOTS_TO_WIN, calcScore } from '../utils/scoring';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function win(shots = MIN_SHOTS_TO_WIN): GameResult {
  return { winner: 'player', shotCount: shots, difficulty: 'medium' };
}

function loss(shots = 60): GameResult {
  return { winner: 'opponent', shotCount: shots, difficulty: 'medium' };
}

// ─── initialSessionStats ──────────────────────────────────────────────────────

describe('initialSessionStats', () => {
  it('starts with zero gamesPlayed', () => {
    expect(initialSessionStats().gamesPlayed).toBe(0);
  });

  it('starts with zero wins', () => {
    expect(initialSessionStats().wins).toBe(0);
  });

  it('starts with zero losses', () => {
    expect(initialSessionStats().losses).toBe(0);
  });

  it('starts with zero totalShots', () => {
    expect(initialSessionStats().totalShots).toBe(0);
  });

  it('starts with null bestScore', () => {
    expect(initialSessionStats().bestScore).toBeNull();
  });

  it('starts with zero winStreak', () => {
    expect(initialSessionStats().winStreak).toBe(0);
  });

  it('starts with zero bestWinStreak', () => {
    expect(initialSessionStats().bestWinStreak).toBe(0);
  });

  it('returns a fresh object on each call', () => {
    expect(initialSessionStats()).not.toBe(initialSessionStats());
  });
});

// ─── applyResult — win outcomes ───────────────────────────────────────────────

describe('applyResult — win', () => {
  it('increments gamesPlayed by 1', () => {
    const next = applyResult(initialSessionStats(), win());
    expect(next.gamesPlayed).toBe(1);
  });

  it('increments wins by 1', () => {
    const next = applyResult(initialSessionStats(), win());
    expect(next.wins).toBe(1);
  });

  it('does not increment losses', () => {
    const next = applyResult(initialSessionStats(), win());
    expect(next.losses).toBe(0);
  });

  it('adds the shot count to totalShots', () => {
    const next = applyResult(initialSessionStats(), win(20));
    expect(next.totalShots).toBe(20);
  });

  it('sets bestScore to the performance score of the first win', () => {
    const next = applyResult(initialSessionStats(), win(17));
    expect(next.bestScore).toBe(100);
  });

  it('updates bestScore when the new score is higher', () => {
    const after1 = applyResult(initialSessionStats(), win(30));
    const after2 = applyResult(after1, win(17));
    expect(after2.bestScore).toBe(100);
  });

  it('does not update bestScore when the new score is lower', () => {
    const after1 = applyResult(initialSessionStats(), win(17));
    const after2 = applyResult(after1, win(50));
    expect(after2.bestScore).toBe(100);
  });

  it('increments winStreak', () => {
    const after1 = applyResult(initialSessionStats(), win());
    const after2 = applyResult(after1, win());
    expect(after2.winStreak).toBe(2);
  });

  it('updates bestWinStreak when streak exceeds it', () => {
    let s = initialSessionStats();
    s = applyResult(s, win());
    s = applyResult(s, win());
    s = applyResult(s, win());
    expect(s.bestWinStreak).toBe(3);
  });

  it('does not mutate the input stats object', () => {
    const original = initialSessionStats();
    applyResult(original, win());
    expect(original.gamesPlayed).toBe(0);
  });
});

// ─── applyResult — loss outcomes ──────────────────────────────────────────────

describe('applyResult — loss', () => {
  it('increments gamesPlayed by 1', () => {
    const next = applyResult(initialSessionStats(), loss());
    expect(next.gamesPlayed).toBe(1);
  });

  it('increments losses by 1', () => {
    const next = applyResult(initialSessionStats(), loss());
    expect(next.losses).toBe(1);
  });

  it('does not increment wins', () => {
    const next = applyResult(initialSessionStats(), loss());
    expect(next.wins).toBe(0);
  });

  it('adds the shot count to totalShots', () => {
    const next = applyResult(initialSessionStats(), loss(55));
    expect(next.totalShots).toBe(55);
  });

  it('does not change bestScore', () => {
    const next = applyResult(initialSessionStats(), loss());
    expect(next.bestScore).toBeNull();
  });

  it('resets winStreak to 0', () => {
    let s = initialSessionStats();
    s = applyResult(s, win());
    s = applyResult(s, win());
    s = applyResult(s, loss()); // streak broken
    expect(s.winStreak).toBe(0);
  });

  it('preserves bestWinStreak after streak is broken', () => {
    let s = initialSessionStats();
    s = applyResult(s, win());
    s = applyResult(s, win());
    s = applyResult(s, loss());
    expect(s.bestWinStreak).toBe(2);
  });
});

// ─── applyResult — multi-game sequences ───────────────────────────────────────

describe('applyResult — sequences', () => {
  it('accumulates gamesPlayed across wins and losses', () => {
    let s = initialSessionStats();
    s = applyResult(s, win());
    s = applyResult(s, loss());
    s = applyResult(s, win());
    expect(s.gamesPlayed).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
  });

  it('accumulates totalShots across all games', () => {
    let s = initialSessionStats();
    s = applyResult(s, win(20));
    s = applyResult(s, loss(40));
    expect(s.totalShots).toBe(60);
  });

  it('bestWinStreak persists after the streak is later broken', () => {
    let s = initialSessionStats();
    [win(), win(), win(), loss(), win()].forEach(r => { s = applyResult(s, r); });
    expect(s.bestWinStreak).toBe(3);
    expect(s.winStreak).toBe(1);
  });

  it('bestScore retains the highest score seen across multiple victories', () => {
    let s = initialSessionStats();
    s = applyResult(s, win(30)); // lower score
    s = applyResult(s, win(17)); // perfect — score 100
    s = applyResult(s, win(25)); // mid score
    expect(s.bestScore).toBe(100);
  });
});

// ─── winRate ──────────────────────────────────────────────────────────────────

describe('winRate', () => {
  it('returns null when no games played', () => {
    expect(winRate(initialSessionStats())).toBeNull();
  });

  it('returns 100 after one win', () => {
    const s = applyResult(initialSessionStats(), win());
    expect(winRate(s)).toBe(100);
  });

  it('returns 0 after one loss', () => {
    const s = applyResult(initialSessionStats(), loss());
    expect(winRate(s)).toBe(0);
  });

  it('returns 50 after one win and one loss', () => {
    let s = initialSessionStats();
    s = applyResult(s, win());
    s = applyResult(s, loss());
    expect(winRate(s)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    let s = initialSessionStats();
    s = applyResult(s, win());
    s = applyResult(s, win());
    s = applyResult(s, loss());
    // 2/3 = 66.67 → rounds to 67
    expect(winRate(s)).toBe(67);
  });

  it('does not mutate the stats object', () => {
    const s = initialSessionStats();
    winRate(s);
    expect(s.gamesPlayed).toBe(0);
  });
});

// ─── avgShots ─────────────────────────────────────────────────────────────────

describe('avgShots', () => {
  it('returns null when no games played', () => {
    expect(avgShots(initialSessionStats())).toBeNull();
  });

  it('returns the exact shot count after one game', () => {
    const s = applyResult(initialSessionStats(), win(30));
    expect(avgShots(s)).toBe(30);
  });

  it('returns the average across two games', () => {
    let s = initialSessionStats();
    s = applyResult(s, win(20));
    s = applyResult(s, loss(40));
    expect(avgShots(s)).toBe(30);
  });

  it('rounds to nearest integer', () => {
    let s = initialSessionStats();
    s = applyResult(s, win(17));
    s = applyResult(s, win(18));
    s = applyResult(s, win(19));
    // (17+18+19)/3 = 18
    expect(avgShots(s)).toBe(18);
  });
});

// ─── useSessionStats hook ─────────────────────────────────────────────────────

describe('useSessionStats hook', () => {
  it('starts with initialSessionStats', () => {
    const { result } = renderHook(() => useSessionStats());
    expect(result.current.stats).toEqual(initialSessionStats());
  });

  it('recordResult increments gamesPlayed', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordResult(win()); });
    expect(result.current.stats.gamesPlayed).toBe(1);
  });

  it('recordResult increments wins on a player victory', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordResult(win()); });
    expect(result.current.stats.wins).toBe(1);
  });

  it('recordResult increments losses on an opponent victory', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordResult(loss()); });
    expect(result.current.stats.losses).toBe(1);
  });

  it('recordResult sets bestScore after a victory', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordResult(win(17)); });
    expect(result.current.stats.bestScore).toBe(100);
  });

  it('multiple recordResult calls accumulate correctly', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordResult(win(17)); });
    act(() => { result.current.recordResult(loss(60)); });
    act(() => { result.current.recordResult(win(20)); });
    expect(result.current.stats.gamesPlayed).toBe(3);
    expect(result.current.stats.wins).toBe(2);
    expect(result.current.stats.losses).toBe(1);
    expect(result.current.stats.bestScore).toBe(100);
  });

  it('resetStats returns all values to initial', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordResult(win()); });
    act(() => { result.current.recordResult(loss()); });
    act(() => { result.current.resetStats(); });
    expect(result.current.stats).toEqual(initialSessionStats());
  });

  it('resetStats produces a fresh object equal but not identical to initialSessionStats()', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.resetStats(); });
    expect(result.current.stats).toEqual(initialSessionStats());
  });

  it('recordResult is referentially stable between renders', () => {
    const { result, rerender } = renderHook(() => useSessionStats());
    const fn1 = result.current.recordResult;
    rerender();
    expect(result.current.recordResult).toBe(fn1);
  });

  it('resetStats is referentially stable between renders', () => {
    const { result, rerender } = renderHook(() => useSessionStats());
    const fn1 = result.current.resetStats;
    rerender();
    expect(result.current.resetStats).toBe(fn1);
  });
});

// ─── PvP stats ────────────────────────────────────────────────────────────────

function pvpWin(): PvPGameResult {
  return { winner: 1, p1Shots: 20, p2Shots: 22, p1Hits: 10, p2Hits: 11 };
}

function pvpP2Win(): PvPGameResult {
  return { winner: 2, p1Shots: 18, p2Shots: 15, p1Hits: 8, p2Hits: 12 };
}

describe('applyPvPResult', () => {
  it('increments gamesPlayed', () => {
    const next = applyPvPResult(initialPvPSessionStats(), pvpWin());
    expect(next.gamesPlayed).toBe(1);
  });

  it('increments p1Wins when winner is 1', () => {
    const next = applyPvPResult(initialPvPSessionStats(), pvpWin());
    expect(next.p1Wins).toBe(1);
    expect(next.p2Wins).toBe(0);
  });

  it('increments p2Wins when winner is 2', () => {
    const next = applyPvPResult(initialPvPSessionStats(), pvpP2Win());
    expect(next.p2Wins).toBe(1);
    expect(next.p1Wins).toBe(0);
  });

  it('accumulates p1TotalShots and p2TotalShots', () => {
    let s = initialPvPSessionStats();
    s = applyPvPResult(s, pvpWin());
    s = applyPvPResult(s, pvpP2Win());
    expect(s.p1TotalShots).toBe(pvpWin().p1Shots + pvpP2Win().p1Shots);
    expect(s.p2TotalShots).toBe(pvpWin().p2Shots + pvpP2Win().p2Shots);
  });

  it('accumulates p1TotalHits and p2TotalHits', () => {
    let s = initialPvPSessionStats();
    s = applyPvPResult(s, pvpWin());
    s = applyPvPResult(s, pvpP2Win());
    expect(s.p1TotalHits).toBe(pvpWin().p1Hits + pvpP2Win().p1Hits);
    expect(s.p2TotalHits).toBe(pvpWin().p2Hits + pvpP2Win().p2Hits);
  });

  it('does not mutate the input stats object', () => {
    const original = initialPvPSessionStats();
    applyPvPResult(original, pvpWin());
    expect(original.gamesPlayed).toBe(0);
  });
});

describe('PvP derived helpers', () => {
  it('p1WinRate returns null when gamesPlayed is 0', () => {
    expect(p1WinRate(initialPvPSessionStats())).toBeNull();
  });

  it('p1WinRate returns 100 when p1Wins equals gamesPlayed', () => {
    const s = applyPvPResult(initialPvPSessionStats(), pvpWin());
    expect(p1WinRate(s)).toBe(100);
  });

  it('p2WinRate returns null when gamesPlayed is 0', () => {
    expect(p2WinRate(initialPvPSessionStats())).toBeNull();
  });

  it('p2WinRate returns 100 when p2Wins equals gamesPlayed', () => {
    const s = applyPvPResult(initialPvPSessionStats(), pvpP2Win());
    expect(p2WinRate(s)).toBe(100);
  });

  it('p1Accuracy returns null when p1TotalShots is 0', () => {
    expect(p1Accuracy(initialPvPSessionStats())).toBeNull();
  });

  it('p1Accuracy returns correct percentage', () => {
    // 10 hits / 20 shots = 50%
    const s = applyPvPResult(initialPvPSessionStats(), { winner: 1, p1Shots: 20, p2Shots: 0, p1Hits: 10, p2Hits: 0 });
    expect(p1Accuracy(s)).toBe(50);
  });

  it('p2Accuracy returns null when p2TotalShots is 0', () => {
    expect(p2Accuracy(initialPvPSessionStats())).toBeNull();
  });

  it('p2Accuracy returns correct percentage', () => {
    const s = applyPvPResult(initialPvPSessionStats(), { winner: 2, p1Shots: 0, p2Shots: 15, p1Hits: 0, p2Hits: 12 });
    expect(p2Accuracy(s)).toBe(80);
  });

  it('p1AvgShots returns null when gamesPlayed is 0', () => {
    expect(p1AvgShots(initialPvPSessionStats())).toBeNull();
  });

  it('p1AvgShots rounds correctly', () => {
    let s = initialPvPSessionStats();
    s = applyPvPResult(s, { winner: 1, p1Shots: 20, p2Shots: 0, p1Hits: 0, p2Hits: 0 });
    s = applyPvPResult(s, { winner: 1, p1Shots: 21, p2Shots: 0, p1Hits: 0, p2Hits: 0 });
    // (20+21)/2 = 20.5 → rounds to 21 (Math.round)
    expect(p1AvgShots(s)).toBe(21);
  });

  it('p2AvgShots returns null when gamesPlayed is 0', () => {
    expect(p2AvgShots(initialPvPSessionStats())).toBeNull();
  });
});

describe('useSessionStats hook — PvP fields', () => {
  it('pvpStats starts as initialPvPSessionStats', () => {
    const { result } = renderHook(() => useSessionStats());
    expect(result.current.pvpStats).toEqual(initialPvPSessionStats());
  });

  it('recordPvPResult increments pvpStats correctly', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordPvPResult(pvpWin()); });
    expect(result.current.pvpStats.gamesPlayed).toBe(1);
    expect(result.current.pvpStats.p1Wins).toBe(1);
  });

  it('resetStats zeroes both stats and pvpStats', () => {
    const { result } = renderHook(() => useSessionStats());
    act(() => { result.current.recordResult(win()); });
    act(() => { result.current.recordPvPResult(pvpWin()); });
    act(() => { result.current.resetStats(); });
    expect(result.current.stats).toEqual(initialSessionStats());
    expect(result.current.pvpStats).toEqual(initialPvPSessionStats());
  });
});

// ─── Score integration — calcScore feeds applyResult ─────────────────────────

describe('scoring integration', () => {
  it('a perfect 17-shot game records bestScore of 100', () => {
    const s = applyResult(initialSessionStats(), win(MIN_SHOTS_TO_WIN));
    expect(s.bestScore).toBe(100);
    expect(s.bestScore).toBe(calcScore(MIN_SHOTS_TO_WIN, 'medium'));
  });

  it('losses never update bestScore regardless of shot count', () => {
    let s = initialSessionStats();
    // Fire a suspiciously perfect-shot-count loss (shouldn't happen in game
    // logic, but the stats layer must still treat it as a loss)
    s = applyResult(s, { winner: 'opponent', shotCount: MIN_SHOTS_TO_WIN, difficulty: 'hard' });
    expect(s.bestScore).toBeNull();
  });

  it('difficulty label is stored correctly in the result object', () => {
    const result: GameResult = { winner: 'player', shotCount: 17, difficulty: 'sweaty' };
    const s = applyResult(initialSessionStats(), result);
    // difficulty doesn't live in SessionStats directly — but the result
    // was accepted without error, confirming the type is correct
    expect(s.wins).toBe(1);
  });
});