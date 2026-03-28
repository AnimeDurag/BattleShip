/**
 * Full-game integration tests
 *
 * Simulates a complete game from fleet placement through gameover and verifies
 * the entire scoring pipeline:
 *   playerShotCount → GameResult.shotCount → calcScore → rank
 *
 * Strategy:
 *   1. Use the real useGameState hook (no mocks).
 *   2. Place the player fleet deterministically so we know exact ship positions.
 *   3. Call randomBoard for the AI fleet, then read the placed ship cells so we
 *      can fire at known coordinates — guaranteeing MIN_SHOTS_TO_WIN (17) hits.
 *   4. Advance fake timers to let the AI take its turns.
 *   5. Assert final score, rank, and playerShotCount at game over.
 *
 * Required jest config:  testEnvironment: 'jsdom', preset: 'ts-jest'
 */

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../hooks/useGameState';
import { calcScore, getRank, MIN_SHOTS_TO_WIN } from '../utils/scoring';
import { FLEET } from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function placeFleet(hook: ReturnType<typeof renderHook<ReturnType<typeof useGameState>, unknown>>) {
  FLEET.forEach((def, i) => {
    act(() => { hook.result.current.selectShip(def.name); });
    // Stagger each ship vertically so they never overlap: row = i*2, col = 0
    act(() => { hook.result.current.placeSelectedShip(i * 2, 0); });
  });
}

// Collect every cell occupied by an unsunk ship on the AI board
function getAIShipCells(hook: ReturnType<typeof renderHook<ReturnType<typeof useGameState>, unknown>>): [number, number][] {
  const cells: [number, number][] = [];
  hook.result.current.gameState.opponentBoard.ships.forEach(ship => {
    ship.cells.forEach(cell => cells.push(cell));
  });
  return cells;
}

// ─── Integration suite ────────────────────────────────────────────────────────

describe('Full-game integration', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('completes a full game: placement → play → gameover, phase transitions correctly', () => {
    const hook = renderHook(() => useGameState());

    // ── 1. Difficulty ─────────────────────────────────────────────────────────
    act(() => { hook.result.current.selectDifficulty('easy'); });
    expect(hook.result.current.difficulty).toBe('easy');

    // ── 2. Fleet placement ────────────────────────────────────────────────────
    placeFleet(hook);
    expect(hook.result.current.allShipsPlaced).toBe(true);
    expect(hook.result.current.gameState.phase).toBe('setup');

    // ── 3. Start battle ───────────────────────────────────────────────────────
    act(() => { hook.result.current.beginGame(); });
    expect(hook.result.current.battleStarting).toBe(true);

    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.battleStarting).toBe(false);
    expect(hook.result.current.gameState.phase).toBe('playing');
  });

  it('playerShotCount matches the number of valid player attacks fired', () => {
    const hook = renderHook(() => useGameState());
    act(() => { hook.result.current.selectDifficulty('easy'); });
    placeFleet(hook);
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });

    // Fire 3 shots at cells we know are empty (far corner area, no AI ships likely)
    const shots = [[9,9],[9,8],[9,7]] as [number,number][];
    for (const [r, c] of shots) {
      act(() => { hook.result.current.fireAt(r, c); });
      act(() => { jest.advanceTimersByTime(1500); });
    }

    expect(hook.result.current.playerShotCount).toBe(3);
  });

  it('playerShotCount is strictly less than turnCount (AI shots not counted)', () => {
    const hook = renderHook(() => useGameState());
    act(() => { hook.result.current.selectDifficulty('easy'); });
    placeFleet(hook);
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });

    // Fire once and wait for AI to respond
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { jest.advanceTimersByTime(1500); });

    // Player fired 1; AI also fired 1 (unless that 1 shot ended the game, unlikely)
    if (hook.result.current.gameState.phase === 'playing') {
      expect(hook.result.current.playerShotCount).toBe(1);
      expect(hook.result.current.gameState.shotCount).toBeGreaterThanOrEqual(2);
      expect(hook.result.current.playerShotCount).toBeLessThan(
        hook.result.current.gameState.shotCount
      );
    }
  });

  it('scores 100% and achieves General when player wins with exactly MIN_SHOTS_TO_WIN shots', () => {
    const hook = renderHook(() => useGameState());
    act(() => { hook.result.current.selectDifficulty('easy'); });
    placeFleet(hook);
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });

    // Read AI ship cells after board is revealed
    const aiCells = getAIShipCells(hook);
    expect(aiCells.length).toBe(MIN_SHOTS_TO_WIN); // 17 total ship cells

    // Fire exactly at every AI ship cell
    for (const [r, c] of aiCells) {
      if (hook.result.current.gameState.phase !== 'playing') break;
      act(() => { hook.result.current.fireAt(r, c); });
      act(() => { jest.advanceTimersByTime(1500); });
    }

    // Game should be over and player should have won
    expect(hook.result.current.gameState.phase).toBe('gameover');
    expect(hook.result.current.gameState.winner).toBe('player');

    // Exactly MIN_SHOTS_TO_WIN player shots fired
    expect(hook.result.current.playerShotCount).toBe(MIN_SHOTS_TO_WIN);

    // Score must be 100
    const score = calcScore(hook.result.current.playerShotCount);
    expect(score).toBe(100);

    // Rank must be General of the Armies
    const rank = getRank(score);
    expect(rank.tier).toBe('general');
    expect(rank.label).toBe('GENERAL OF THE ARMIES');
  });

  it('scores less than 100 when player takes more than MIN_SHOTS_TO_WIN', () => {
    const hook = renderHook(() => useGameState());
    act(() => { hook.result.current.selectDifficulty('easy'); });
    placeFleet(hook);
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });

    const aiCells = getAIShipCells(hook);

    // Find two cells that are guaranteed empty on the opponent board right now.
    // Inspect the grid directly so the wasted shot is never accidentally a hit.
    const grid = hook.result.current.gameState.opponentBoard.grid;
    const wasteCells: [number, number][] = [];
    outer: for (let r = 9; r >= 0; r--) {
      for (let col = 9; col >= 0; col--) {
        if (grid[r][col] === 'empty' &&
            !aiCells.some(([ar, ac]) => ar === r && ac === col)) {
          wasteCells.push([r, col]);
          if (wasteCells.length === 2) break outer;
        }
      }
    }

    // Fire the two guaranteed-miss shots first
    for (const [r, col] of wasteCells) {
      if (hook.result.current.gameState.phase !== 'playing') break;
      act(() => { hook.result.current.fireAt(r, col); });
      act(() => { jest.advanceTimersByTime(1500); });
    }

    // Now fire at all AI ship cells to win
    for (const [r, col] of aiCells) {
      if (hook.result.current.gameState.phase !== 'playing') break;
      const cell = hook.result.current.gameState.opponentBoard.grid[r][col];
      if (cell === 'hit' || cell === 'sunk') continue;
      act(() => { hook.result.current.fireAt(r, col); });
      act(() => { jest.advanceTimersByTime(1500); });
    }

    expect(hook.result.current.gameState.phase).toBe('gameover');
    expect(hook.result.current.gameState.winner).toBe('player');
    // Two wasted shots means playerShotCount > MIN_SHOTS_TO_WIN → score < 100
    const score = calcScore(hook.result.current.playerShotCount);
    expect(score).toBeLessThan(100);
    expect(hook.result.current.playerShotCount).toBeGreaterThan(MIN_SHOTS_TO_WIN);
  });

  it('resetGame after gameover clears playerShotCount and phase', () => {
    const hook = renderHook(() => useGameState());
    act(() => { hook.result.current.selectDifficulty('easy'); });
    placeFleet(hook);
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });

    const aiCells = getAIShipCells(hook);
    for (const [r, c] of aiCells) {
      if (hook.result.current.gameState.phase !== 'playing') break;
      act(() => { hook.result.current.fireAt(r, c); });
      act(() => { jest.advanceTimersByTime(1500); });
    }

    expect(hook.result.current.gameState.phase).toBe('gameover');

    act(() => { hook.result.current.resetGame(); });

    expect(hook.result.current.gameState.phase).toBe('setup');
    expect(hook.result.current.playerShotCount).toBe(0);
    expect(hook.result.current.gameState.winner).toBeNull();
    expect(hook.result.current.log).toHaveLength(0);
  });

  it('clearBoard during setup clears all ships and reselects Carrier', () => {
    const hook = renderHook(() => useGameState());
    act(() => { hook.result.current.selectDifficulty('easy'); });
    placeFleet(hook);
    expect(hook.result.current.allShipsPlaced).toBe(true);

    act(() => { hook.result.current.clearBoard(); });

    expect(hook.result.current.gameState.playerBoard.ships).toHaveLength(0);
    expect(hook.result.current.setupState.placedShipNames).toHaveLength(0);
    expect(hook.result.current.setupState.selectedShipName).toBe('Carrier');
    expect(hook.result.current.allShipsPlaced).toBe(false);
  });

  it('replaces cleared board and reaches gameover on second game', () => {
    const hook = renderHook(() => useGameState());
    act(() => { hook.result.current.selectDifficulty('easy'); });
    placeFleet(hook);
    act(() => { hook.result.current.clearBoard(); });
    placeFleet(hook); // re-place after clearing

    expect(hook.result.current.allShipsPlaced).toBe(true);

    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.gameState.phase).toBe('playing');

    const aiCells = getAIShipCells(hook);
    for (const [r, c] of aiCells) {
      if (hook.result.current.gameState.phase !== 'playing') break;
      act(() => { hook.result.current.fireAt(r, c); });
      act(() => { jest.advanceTimersByTime(1500); });
    }

    expect(hook.result.current.gameState.phase).toBe('gameover');
    expect(hook.result.current.gameState.winner).toBe('player');
    expect(calcScore(hook.result.current.playerShotCount)).toBe(100);
  });
});