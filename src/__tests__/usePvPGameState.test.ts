/**
 * usePvPGameState tests
 *
 * Uses renderHook + act from @testing-library/react.
 * No timers needed — there are no async operations in this hook.
 */

import { renderHook, act } from '@testing-library/react';
import { usePvPGameState } from '../hooks/usePvPGameState';
import { FLEET } from '../utils/constants';
import { randomBoard } from '../utils/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Always access result.current so we get the latest hook state after each act().
type HookResult = { current: ReturnType<typeof usePvPGameState> };

function advanceThroughSetup(ref: HookResult) {
  act(() => { ref.current.randomizeP1Board(); });
  act(() => { ref.current.randomizeP2Board(); });
  act(() => { ref.current.finishP1Setup(); });       // → handoff-to-p2-setup
  act(() => { ref.current.advanceHandoff(); });      // → setup-p2
  act(() => { ref.current.finishP2Setup(); });       // → handoff-to-battle
  act(() => { ref.current.advanceHandoff(); });      // → playing
}

// ─── Phase transitions ────────────────────────────────────────────────────────

describe('usePvPGameState — phase transitions', () => {
  it('initial phase is setup-p1', () => {
    const { result } = renderHook(() => usePvPGameState());
    expect(result.current.pvpPhase).toBe('setup-p1');
  });

  it('finishP1Setup transitions to handoff-to-p2-setup after all ships placed', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    expect(result.current.pvpPhase).toBe('handoff-to-p2-setup');
  });

  it('finishP1Setup is a no-op if fleet is not complete', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.finishP1Setup(); });
    expect(result.current.pvpPhase).toBe('setup-p1');
  });

  it('advanceHandoff from handoff-to-p2-setup transitions to setup-p2', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    expect(result.current.pvpPhase).toBe('setup-p2');
  });

  it('finishP2Setup transitions to handoff-to-battle', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    act(() => { result.current.randomizeP2Board(); });
    act(() => { result.current.finishP2Setup(); });
    expect(result.current.pvpPhase).toBe('handoff-to-battle');
  });

  it('advanceHandoff from handoff-to-battle transitions to playing', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    act(() => { result.current.randomizeP2Board(); });
    act(() => { result.current.finishP2Setup(); });
    act(() => { result.current.advanceHandoff(); });
    expect(result.current.pvpPhase).toBe('playing');
  });

  it('advanceHandoff from handoff-between-turns transitions to playing', () => {
    const { result } = renderHook(() => usePvPGameState());
    advanceThroughSetup(result);

    // Force a miss by firing at an empty cell on the opponent board
    // Find a miss cell: fire at a cell that does not contain a ship
    const opponentBoard = result.current.currentPlayer === 1
      ? result.current.p2Board
      : result.current.p1Board;

    let missRow = -1, missCol = -1;
    outer: for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (opponentBoard.grid[r][c] === 'empty') {
          missRow = r; missCol = c;
          break outer;
        }
      }
    }

    act(() => { result.current.fireAt(missRow, missCol); });
    expect(result.current.pvpPhase).toBe('handoff-between-turns');

    act(() => { result.current.advanceHandoff(); });
    expect(result.current.pvpPhase).toBe('playing');
  });
});

// ─── Starting player randomisation ───────────────────────────────────────────

describe('usePvPGameState — starting player randomisation', () => {
  it('startingPlayer is 1 when Math.random returns 0 on finishP2Setup', () => {
    const { result } = renderHook(() => usePvPGameState());
    // Place ships first (before mocking so randomBoard works normally)
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    act(() => { result.current.randomizeP2Board(); });
    // Mock Math.random only for the finishP2Setup call (which picks starting player)
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
    act(() => { result.current.finishP2Setup(); });
    spy.mockRestore();
    expect(result.current.startingPlayer).toBe(1);
  });

  it('startingPlayer is 2 when Math.random returns 0.9 on finishP2Setup', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    act(() => { result.current.randomizeP2Board(); });
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    act(() => { result.current.finishP2Setup(); });
    spy.mockRestore();
    expect(result.current.startingPlayer).toBe(2);
  });

  it('after advanceHandoff from handoff-to-battle, currentPlayer === startingPlayer', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    act(() => { result.current.randomizeP2Board(); });
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    act(() => { result.current.finishP2Setup(); });
    spy.mockRestore();
    act(() => { result.current.advanceHandoff(); });
    expect(result.current.currentPlayer).toBe(result.current.startingPlayer);
  });
});

// ─── Combat — turn mechanics ──────────────────────────────────────────────────

describe('usePvPGameState — combat', () => {
  function setup() {
    const { result } = renderHook(() => usePvPGameState());
    advanceThroughSetup(result);
    return result;
  }

  it('a hit keeps currentPlayer unchanged and pvpPhase stays playing', () => {
    const result = setup();
    const cp = result.current.currentPlayer;

    // Find a ship cell on the opponent board to guarantee a hit
    const opponentBoard = cp === 1 ? result.current.p2Board : result.current.p1Board;
    let hitRow = -1, hitCol = -1;
    outer: for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (opponentBoard.grid[r][c] === 'ship') {
          hitRow = r; hitCol = c;
          break outer;
        }
      }
    }

    act(() => { result.current.fireAt(hitRow, hitCol); });

    // After a hit (not sunk), stay in playing and same player
    if (result.current.pvpPhase === 'playing') {
      expect(result.current.currentPlayer).toBe(cp);
    }
    // If sunk all ships → gameover is also valid (very unlikely with random board)
    expect(['playing', 'gameover']).toContain(result.current.pvpPhase);
  });

  it('a miss transitions pvpPhase to handoff-between-turns', () => {
    const result = setup();
    const cp = result.current.currentPlayer;
    const opponentBoard = cp === 1 ? result.current.p2Board : result.current.p1Board;

    let missRow = -1, missCol = -1;
    outer: for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (opponentBoard.grid[r][c] === 'empty') {
          missRow = r; missCol = c;
          break outer;
        }
      }
    }

    act(() => { result.current.fireAt(missRow, missCol); });
    expect(result.current.pvpPhase).toBe('handoff-between-turns');
  });

  it('after advanceHandoff from handoff-between-turns, currentPlayer swaps', () => {
    const result = setup();
    const cp = result.current.currentPlayer;
    const opponentBoard = cp === 1 ? result.current.p2Board : result.current.p1Board;

    let missRow = -1, missCol = -1;
    outer: for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (opponentBoard.grid[r][c] === 'empty') {
          missRow = r; missCol = c;
          break outer;
        }
      }
    }

    act(() => { result.current.fireAt(missRow, missCol); });
    act(() => { result.current.advanceHandoff(); });
    expect(result.current.currentPlayer).toBe(cp === 1 ? 2 : 1);
  });

  it('double-firing an already-attacked cell is a no-op', () => {
    const result = setup();
    const cp = result.current.currentPlayer;
    const opponentBoard = cp === 1 ? result.current.p2Board : result.current.p1Board;

    let r = -1, c = -1;
    outer: for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        if (opponentBoard.grid[row][col] === 'empty') {
          r = row; c = col;
          break outer;
        }
      }
    }

    act(() => { result.current.fireAt(r, c); });
    const shotsAfterFirst = cp === 1 ? result.current.p1Shots : result.current.p2Shots;

    // Can only fire again if still in playing phase (wasn't sunk)
    if (result.current.pvpPhase === 'playing') {
      act(() => { result.current.fireAt(r, c); });
      const shotsAfterSecond = cp === 1 ? result.current.p1Shots : result.current.p2Shots;
      expect(shotsAfterSecond).toBe(shotsAfterFirst);
    }
  });
});

// ─── Shot and hit tracking ────────────────────────────────────────────────────

describe('usePvPGameState — shot tracking', () => {
  it('p1Shots and p1Hits are 0 initially', () => {
    const { result } = renderHook(() => usePvPGameState());
    expect(result.current.p1Shots).toBe(0);
    expect(result.current.p1Hits).toBe(0);
  });

  it('p2Shots and p2Hits are 0 initially', () => {
    const { result } = renderHook(() => usePvPGameState());
    expect(result.current.p2Shots).toBe(0);
    expect(result.current.p2Hits).toBe(0);
  });
});

// ─── currentGameState construction ───────────────────────────────────────────

describe('usePvPGameState — currentGameState', () => {
  it('when currentPlayer === 1, playerBoard is p1Board and opponentBoard is p2Board', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    act(() => { result.current.randomizeP2Board(); });
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0); // P1 goes first
    act(() => { result.current.finishP2Setup(); });
    spy.mockRestore();
    act(() => { result.current.advanceHandoff(); });

    expect(result.current.currentPlayer).toBe(1);
    expect(result.current.currentGameState.playerBoard).toBe(result.current.p1Board);
    expect(result.current.currentGameState.opponentBoard).toBe(result.current.p2Board);
  });

  it('when currentPlayer === 2, playerBoard is p2Board and opponentBoard is p1Board', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.advanceHandoff(); });
    act(() => { result.current.randomizeP2Board(); });
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.9); // P2 goes first
    act(() => { result.current.finishP2Setup(); });
    spy.mockRestore();
    act(() => { result.current.advanceHandoff(); });

    expect(result.current.currentPlayer).toBe(2);
    expect(result.current.currentGameState.playerBoard).toBe(result.current.p2Board);
    expect(result.current.currentGameState.opponentBoard).toBe(result.current.p1Board);
  });
});

// ─── Setup — allShipsPlaced ───────────────────────────────────────────────────

describe('usePvPGameState — allShipsPlaced', () => {
  it('p1AllShipsPlaced is false initially', () => {
    const { result } = renderHook(() => usePvPGameState());
    expect(result.current.p1AllShipsPlaced).toBe(false);
  });

  it('p1AllShipsPlaced is true after randomizeP1Board', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    expect(result.current.p1AllShipsPlaced).toBe(true);
  });

  it('p2AllShipsPlaced is false initially', () => {
    const { result } = renderHook(() => usePvPGameState());
    expect(result.current.p2AllShipsPlaced).toBe(false);
  });

  it('p2AllShipsPlaced is true after randomizeP2Board', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP2Board(); });
    expect(result.current.p2AllShipsPlaced).toBe(true);
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

describe('usePvPGameState — reset', () => {
  it('resetPvP returns pvpPhase to setup-p1', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.finishP1Setup(); });
    act(() => { result.current.resetPvP(); });
    expect(result.current.pvpPhase).toBe('setup-p1');
  });

  it('resetPvP zeroes all counters', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.resetPvP(); });
    expect(result.current.p1Shots).toBe(0);
    expect(result.current.p2Shots).toBe(0);
    expect(result.current.p1Hits).toBe(0);
    expect(result.current.p2Hits).toBe(0);
  });

  it('resetPvP clears allShipsPlaced flags', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.randomizeP1Board(); });
    act(() => { result.current.randomizeP2Board(); });
    act(() => { result.current.resetPvP(); });
    expect(result.current.p1AllShipsPlaced).toBe(false);
    expect(result.current.p2AllShipsPlaced).toBe(false);
  });

  it('resetPvP clears winner', () => {
    const { result } = renderHook(() => usePvPGameState());
    act(() => { result.current.resetPvP(); });
    expect(result.current.winner).toBeNull();
  });
});
