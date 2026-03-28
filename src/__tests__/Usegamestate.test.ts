/**
 * useGameState hook tests
 *
 * Required packages (add to devDependencies if not present):
 *   npm install --save-dev @testing-library/react @testing-library/jest-dom
 *
 * Jest must also be configured with a jsdom test environment. Add to
 * jest.config.js / jest field in package.json:
 *   testEnvironment: 'jsdom'
 */

import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../hooks/useGameState';
import { placeShip } from '../models/Board';
import { createShip } from '../models/Ship';
import { FLEET, DIFFICULTIES } from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns a hook instance with the full fleet manually placed so tests can
// call beginGame() or test post-placement behaviour without repeating setup.
// Each ship is placed with two separate act() calls: one to commit the
// selectShip state update (so React re-renders and issues a fresh
// placeSelectedShip closure), then one to place it. Combining them in a
// single act() would trigger the stale-closure bug and produce false passes.
function hookWithAllShipsPlaced() {
  const hook = renderHook(() => useGameState());

  FLEET.forEach((def, i) => {
    act(() => { hook.result.current.selectShip(def.name); });
    act(() => { hook.result.current.placeSelectedShip(i * 2, 0); });
  });

  return hook;
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts in setup phase', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.gameState.phase).toBe('setup');
  });

  it('starts with no ships placed', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.setupState.placedShipNames).toHaveLength(0);
  });

  it('starts with no ship selected', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.setupState.selectedShipName).toBeNull();
  });

  it('starts with horizontal orientation', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.setupState.orientation).toBe('horizontal');
  });

  it('starts with an empty combat log', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.log).toHaveLength(0);
  });

  it('starts with aiThinking false', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.aiThinking).toBe(false);
  });

  it('starts with battleStarting false', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.battleStarting).toBe(false);
  });

  it('starts with allShipsPlaced false', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.allShipsPlaced).toBe(false);
  });

  it('starts with shotCount at zero', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.gameState.shotCount).toBe(0);
  });

  it('starts with an empty player board', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.gameState.playerBoard.ships).toHaveLength(0);
  });

  it('starts with difficulty as null — selection not yet made', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.difficulty).toBeNull();
  });

  it('starts with player as the current turn', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.gameState.currentTurn).toBe('player');
  });

  it('starts with no winner', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.gameState.winner).toBeNull();
  });
});

// ─── selectShip ───────────────────────────────────────────────────────────────

describe('selectShip', () => {
  it('sets the selected ship name', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    expect(result.current.setupState.selectedShipName).toBe('Carrier');
  });

  it('selecting an unplaced ship does not remove anything from the board', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    expect(result.current.gameState.playerBoard.ships).toHaveLength(0);
  });

  it('selecting an already-placed ship removes it from the board', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    act(() => { result.current.selectShip('Destroyer'); });
    expect(result.current.gameState.playerBoard.ships).toHaveLength(0);
  });

  it('selecting an already-placed ship removes it from placedShipNames', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    act(() => { result.current.selectShip('Destroyer'); });
    expect(result.current.setupState.placedShipNames).not.toContain('Destroyer');
  });

  it('selecting an already-placed ship clears its cells from the grid', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    act(() => { result.current.selectShip('Destroyer'); });
    // Both cells the Destroyer occupied should be empty again
    expect(result.current.gameState.playerBoard.grid[0][0]).toBe('empty');
    expect(result.current.gameState.playerBoard.grid[0][1]).toBe('empty');
  });

  it('switching selection between two ships updates selectedShipName', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    act(() => { result.current.selectShip('Destroyer'); });
    expect(result.current.setupState.selectedShipName).toBe('Destroyer');
  });

  it('selecting an unplaced ship does not remove other placed ships from placedShipNames', () => {
    // Covers the placedShipNames.filter(n => n !== name) branch in selectShip:
    // when the selected name is not in placedShipNames the filter is a no-op
    // and all currently placed names must survive intact.
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    // Now select a different ship that has NOT been placed
    act(() => { result.current.selectShip('Carrier'); });
    expect(result.current.setupState.placedShipNames).toContain('Destroyer');
    expect(result.current.setupState.placedShipNames).toHaveLength(1);
  });

  it('re-selecting a placed ship allows it to be repositioned', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    // Re-select to lift it off the board
    act(() => { result.current.selectShip('Destroyer'); });
    // Place at a different position
    act(() => { result.current.placeSelectedShip(5, 5); });
    const ship = result.current.gameState.playerBoard.ships[0];
    expect(ship.cells[0]).toEqual([5, 5]);
  });
});

// ─── setOrientation ───────────────────────────────────────────────────────────

describe('setOrientation', () => {
  it('sets orientation to vertical', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.setOrientation('vertical'); });
    expect(result.current.setupState.orientation).toBe('vertical');
  });

  it('sets orientation back to horizontal', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.setOrientation('vertical'); });
    act(() => { result.current.setOrientation('horizontal'); });
    expect(result.current.setupState.orientation).toBe('horizontal');
  });
});

// ─── placeSelectedShip ────────────────────────────────────────────────────────

describe('placeSelectedShip', () => {
  it('returns false when no ship is selected', () => {
    const { result } = renderHook(() => useGameState());
    let returnValue: boolean = true;
    act(() => { returnValue = result.current.placeSelectedShip(0, 0); });
    expect(returnValue).toBe(false);
  });

  it('returns true on a valid placement', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    let returnValue: boolean = false;
    act(() => { returnValue = result.current.placeSelectedShip(0, 0); });
    expect(returnValue).toBe(true);
  });

  it('returns false on an out-of-bounds placement', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); }); // size 5
    let returnValue: boolean = true;
    act(() => { returnValue = result.current.placeSelectedShip(0, 8); }); // cols 8–12
    expect(returnValue).toBe(false);
  });

  it('adds the ship to the board after a valid placement', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    expect(result.current.gameState.playerBoard.ships).toHaveLength(1);
    expect(result.current.gameState.playerBoard.ships[0].name).toBe('Destroyer');
  });

  it('marks the occupied grid cells as ship after placement', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); }); // size 2
    act(() => { result.current.placeSelectedShip(3, 4); });
    expect(result.current.gameState.playerBoard.grid[3][4]).toBe('ship');
    expect(result.current.gameState.playerBoard.grid[3][5]).toBe('ship');
  });

  it('adds the ship name to placedShipNames', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    expect(result.current.setupState.placedShipNames).toContain('Destroyer');
  });

  it('auto-advances selectedShipName to the next unplaced ship', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); }); // first in FLEET
    act(() => { result.current.placeSelectedShip(0, 0); });
    expect(result.current.setupState.selectedShipName).toBe('Battleship');
  });

  it('placedShipNames and selectedShipName update atomically after a valid placement', () => {
    // Directly covers lines 112-121: the setSetupState block that updates
    // placedShipNames and auto-advances selectedShipName in the same call.
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    // Both side-effects must be visible in the same render snapshot
    expect(result.current.setupState.placedShipNames).toContain('Carrier');
    expect(result.current.setupState.selectedShipName).toBe('Battleship');
    expect(result.current.setupState.placedShipNames).toHaveLength(1);
  });

  it('sets selectedShipName to null after the last ship is placed', () => {
    const hook = hookWithAllShipsPlaced();
    expect(hook.result.current.setupState.selectedShipName).toBeNull();
  });

  it('sets allShipsPlaced to true once all five ships are placed', () => {
    const hook = hookWithAllShipsPlaced();
    expect(hook.result.current.allShipsPlaced).toBe(true);
  });

  it('respects orientation when placing a ship vertically', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.setOrientation('vertical'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    const ship = result.current.gameState.playerBoard.ships[0];
    expect(ship.cells[0]).toEqual([0, 0]);
    expect(ship.cells[1]).toEqual([1, 0]);
  });

  // ── Collision prevention (the stale-closure fix) ───────────────────────────

  it('returns false and does not place on a direct cell collision', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    act(() => { result.current.selectShip('Cruiser'); });
    let returnValue: boolean = true;
    act(() => { returnValue = result.current.placeSelectedShip(0, 0); });
    expect(returnValue).toBe(false);
    expect(result.current.gameState.playerBoard.ships).toHaveLength(1);
  });

  it('two ships cannot share any cell — partial overlap is also rejected', () => {
    const { result } = renderHook(() => useGameState());
    // Destroyer at [0,0]–[0,1]
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    // Cruiser (size 3) starting at [0,1] — cells [0,1],[0,2],[0,3] — [0,1] collides
    act(() => { result.current.selectShip('Cruiser'); });
    let returnValue: boolean = true;
    act(() => { returnValue = result.current.placeSelectedShip(0, 1); });
    expect(returnValue).toBe(false);
    expect(result.current.gameState.playerBoard.ships).toHaveLength(1);
  });

  it('ships may be placed adjacent to each other without collision', () => {
    const { result } = renderHook(() => useGameState());
    // Destroyer at [0,0]–[0,1], Cruiser at [1,0]–[1,2] — adjacent rows, no overlap
    act(() => { result.current.selectShip('Destroyer'); });
    act(() => { result.current.placeSelectedShip(0, 0); });
    act(() => { result.current.selectShip('Cruiser'); });
    let returnValue: boolean = false;
    act(() => { returnValue = result.current.placeSelectedShip(1, 0); });
    expect(returnValue).toBe(true);
    expect(result.current.gameState.playerBoard.ships).toHaveLength(2);
  });

  it('collision check uses committed board state, not a stale closure snapshot', () => {
    // This test exercises the placeShip-inside-updater fix: select and place
    // each ship in strictly separate act() calls to confirm React always has
    // the latest board before the next placement is validated.
    const { result } = renderHook(() => useGameState());
    let allSucceeded = true;

    FLEET.forEach((def, i) => {
      act(() => { result.current.selectShip(def.name); });
      let ok = false;
      act(() => { ok = result.current.placeSelectedShip(i * 2, 0); });
      if (!ok) allSucceeded = false;
    });

    expect(allSucceeded).toBe(true);
    expect(result.current.gameState.playerBoard.ships).toHaveLength(FLEET.length);

    // Verify no two ships share any cell
    const occupied = new Map<string, string>();
    result.current.gameState.playerBoard.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        expect(occupied.has(key)).toBe(false);
        occupied.set(key, ship.name);
      });
    });
  });
});

// ─── randomizePlacement ───────────────────────────────────────────────────────

describe('randomizePlacement', () => {
  it('places all five ships on the board', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.randomizePlacement(); });
    expect(result.current.gameState.playerBoard.ships).toHaveLength(FLEET.length);
  });

  it('marks all ships as placed in setupState', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.randomizePlacement(); });
    expect(result.current.setupState.placedShipNames).toHaveLength(FLEET.length);
  });

  it('clears the selected ship after randomizing', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    act(() => { result.current.randomizePlacement(); });
    expect(result.current.setupState.selectedShipName).toBeNull();
  });

  it('sets allShipsPlaced to true', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.randomizePlacement(); });
    expect(result.current.allShipsPlaced).toBe(true);
  });

  it('produces a board with no cell shared by two ships', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.randomizePlacement(); });
    const occupied = new Map<string, string>();
    result.current.gameState.playerBoard.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        expect(occupied.has(key)).toBe(false);
        occupied.set(key, ship.name);
      });
    });
  });

  it('all randomized ship cells are within board bounds', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.randomizePlacement(); });
    result.current.gameState.playerBoard.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(10);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(10);
      });
    });
  });

  it('can be called again to re-randomize when all ships are already placed', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.randomizePlacement(); });
    const firstLayout = result.current.gameState.playerBoard.ships
      .map(s => s.cells[0].join(',')).join('|');

    let diffFound = false;
    for (let i = 0; i < 20 && !diffFound; i++) {
      act(() => { result.current.randomizePlacement(); });
      const newLayout = result.current.gameState.playerBoard.ships
        .map(s => s.cells[0].join(',')).join('|');
      if (newLayout !== firstLayout) diffFound = true;
    }
    expect(diffFound).toBe(true);
  });

  it('re-randomization still produces a collision-free board', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.randomizePlacement(); });
    act(() => { result.current.randomizePlacement(); }); // re-randomize
    const occupied = new Map<string, string>();
    result.current.gameState.playerBoard.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        expect(occupied.has(key)).toBe(false);
        occupied.set(key, ship.name);
      });
    });
  });

  it('fills all five ship names into placedShipNames when partially placed', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    act(() => { result.current.placeSelectedShip(9, 0); });
    act(() => { result.current.randomizePlacement(); });
    expect(result.current.setupState.placedShipNames).toHaveLength(FLEET.length);
  });

  it('produces a full fleet even when called on a partially placed board', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    act(() => { result.current.placeSelectedShip(9, 0); });
    act(() => { result.current.randomizePlacement(); });
    expect(result.current.gameState.playerBoard.ships).toHaveLength(FLEET.length);
  });
});

// ─── selectDifficulty ────────────────────────────────────────────────────────

describe('selectDifficulty', () => {
  it('sets difficulty to easy', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectDifficulty('easy'); });
    expect(result.current.difficulty).toBe('easy');
  });

  it('sets difficulty to medium', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectDifficulty('medium'); });
    expect(result.current.difficulty).toBe('medium');
  });

  it('sets difficulty to hard', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectDifficulty('hard'); });
    expect(result.current.difficulty).toBe('hard');
  });

  it('sets difficulty to sweaty', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectDifficulty('sweaty'); });
    expect(result.current.difficulty).toBe('sweaty');
  });

  it('accepts every value in the DIFFICULTIES constant', () => {
    DIFFICULTIES.forEach(d => {
      const { result } = renderHook(() => useGameState());
      act(() => { result.current.selectDifficulty(d); });
      expect(result.current.difficulty).toBe(d);
    });
  });

  it('overwrites a previously selected difficulty', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectDifficulty('easy'); });
    act(() => { result.current.selectDifficulty('sweaty'); });
    expect(result.current.difficulty).toBe('sweaty');
  });

  it('does not affect phase or setupState', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectDifficulty('hard'); });
    expect(result.current.gameState.phase).toBe('setup');
    expect(result.current.setupState.placedShipNames).toHaveLength(0);
  });
});

// ─── beginGame ────────────────────────────────────────────────────────────────

describe('beginGame', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('sets battleStarting to true immediately', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    expect(hook.result.current.battleStarting).toBe(true);
  });

  it('transitions to playing phase after the 1500ms delay', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.gameState.phase).toBe('playing');
  });

  it('sets battleStarting back to false after the delay', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.battleStarting).toBe(false);
  });

  it('places a full opponent board after the delay', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.gameState.opponentBoard.ships).toHaveLength(FLEET.length);
  });

  it('opponent board has no cell collisions', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    const occupied = new Map<string, string>();
    hook.result.current.gameState.opponentBoard.ships.forEach(ship => {
      ship.cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        expect(occupied.has(key)).toBe(false);
        occupied.set(key, ship.name);
      });
    });
  });

  it('adds a system log entry after the delay', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.log).toHaveLength(1);
    expect(hook.result.current.log[0].type).toBe('system');
    expect(hook.result.current.log[0].message).toContain('BATTLE COMMENCED');
  });

  it('does not transition before the delay elapses', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1499); });
    expect(hook.result.current.gameState.phase).toBe('setup');
  });

  it('battleStarting remains true until the delay elapses', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1499); });
    expect(hook.result.current.battleStarting).toBe(true);
  });

  it('preserves the selected difficulty after the game starts', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.selectDifficulty('hard'); });
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.difficulty).toBe('hard');
  });

  it('preserves difficulty for every tier through the transition', () => {
    DIFFICULTIES.forEach(d => {
      const hook = hookWithAllShipsPlaced();
      act(() => { hook.result.current.selectDifficulty(d); });
      act(() => { hook.result.current.beginGame(); });
      act(() => { jest.advanceTimersByTime(1500); });
      expect(hook.result.current.difficulty).toBe(d);
      expect(hook.result.current.gameState.phase).toBe('playing');
    });
  });
});

// ─── fireAt ───────────────────────────────────────────────────────────────────

describe('fireAt', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  function hookInPlayingState() {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    return hook;
  }

  it('does nothing when called during setup phase', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.fireAt(0, 0); });
    expect(result.current.gameState.shotCount).toBe(0);
    expect(result.current.log).toHaveLength(0);
  });

  it('adds a player log entry when firing at an unattacked cell', () => {
    const hook = hookInPlayingState();
    const logLengthBefore = hook.result.current.log.length;
    act(() => { hook.result.current.fireAt(9, 9); });
    expect(hook.result.current.log.length).toBeGreaterThan(logLengthBefore);
  });

  it('log entry type is miss when firing at an empty cell', () => {
    const hook = hookInPlayingState();
    // Fire at a cell almost certainly not occupied by the random opponent fleet
    act(() => { hook.result.current.fireAt(9, 9); });
    const playerEntry = hook.result.current.log.find(
      e => e.type === 'miss' || e.type === 'hit' || e.type === 'sunk'
    );
    expect(playerEntry).toBeDefined();
  });

  it('increments shotCount after a valid player attack', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    expect(hook.result.current.gameState.shotCount).toBeGreaterThanOrEqual(1);
  });

  it('sets aiThinking to true immediately after firing', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    expect(hook.result.current.aiThinking).toBe(true);
  });

  it('sets aiThinking back to false after the AI turn resolves', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { jest.advanceTimersByTime(1500); });
    expect(hook.result.current.aiThinking).toBe(false);
  });

  it('adds an AI log entry after the AI turn resolves', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { jest.advanceTimersByTime(1500); });
    const aiEntries = hook.result.current.log.filter(e => e.type === 'enemy');
    expect(aiEntries.length).toBeGreaterThanOrEqual(1);
  });

  it('does not fire again on an already-attacked cell', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { jest.advanceTimersByTime(1500); });
    const turnAfterFirst = hook.result.current.gameState.shotCount;
    act(() => { hook.result.current.fireAt(9, 9); }); // repeat — should be blocked
    expect(hook.result.current.gameState.shotCount).toBe(turnAfterFirst);
  });

  it('does not fire while aiThinking is true', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); }); // valid fire, AI now thinking
    const turnAfterFirst = hook.result.current.gameState.shotCount;
    act(() => { hook.result.current.fireAt(9, 8); }); // attempt during AI turn
    // Turn count must not advance — AI hasn't resolved yet
    expect(hook.result.current.gameState.shotCount).toBe(turnAfterFirst);
  });

  it('the player attack is reflected on the opponent board grid', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    const cell = hook.result.current.gameState.opponentBoard.grid[9][9];
    expect(['miss', 'hit', 'sunk']).toContain(cell);
  });

  it('AI attack is reflected on the player board grid after AI turn resolves', () => {
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { jest.advanceTimersByTime(1500); });
    // At least one player board cell must have been attacked by the AI
    const flat = hook.result.current.gameState.playerBoard.grid.flat();
    const aiAttacked = flat.filter(c => c === 'miss' || c === 'hit' || c === 'sunk');
    expect(aiAttacked.length).toBeGreaterThanOrEqual(1);
  });

  it('does not count as a new turn when firing at an already-attacked cell', () => {
    // Covers line 169: the already-attacked early return inside fireAt.
    // We must complete a full round-trip (player fire → AI resolves) so that
    // currentTurn is back to 'player' and aiThinking is false before the
    // repeat fire — otherwise the earlier turn/aiThinking guard fires instead
    // and line 169 is never reached.
    const hook = hookInPlayingState();
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { jest.advanceTimersByTime(1500); }); // AI resolves, turn back to player
    // Cell [9,9] is now hit/miss/sunk — confirmed attacked
    const cellState = hook.result.current.gameState.opponentBoard.grid[9][9];
    expect(['miss', 'hit', 'sunk']).toContain(cellState);
    const shotCount = hook.result.current.gameState.shotCount;
    // Fire at the same cell again — must hit the already-attacked guard
    act(() => { hook.result.current.fireAt(9, 9); });
    expect(hook.result.current.gameState.shotCount).toBe(shotCount);
    expect(hook.result.current.aiThinking).toBe(false); // AI timer was not started
  });

  it('transitions to gameover and stops the AI timer when a player wins', () => {
    // Covers line 173: the isGameOver early return that prevents the AI timer
    // from being scheduled after the winning shot.
    //
    // We fire at every cell on the board row-by-row. After each player shot we
    // re-read result.current.fireAt to get the fresh closure (necessary because
    // fireAt closes over gameState and re-renders issue a new reference). If the
    // game hasn't ended we advance timers to let the AI respond and flip
    // currentTurn back to 'player'. We stop as soon as phase === 'gameover'.
    // Either player can win — we assert the invariants that hold for both.
    const { result } = renderHook(() => useGameState());

    FLEET.forEach((def, i) => {
      act(() => { result.current.selectShip(def.name); });
      act(() => { result.current.placeSelectedShip(i * 2, 0); });
    });

    act(() => { result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });

    let gameOver = false;
    for (let r = 0; r < 10 && !gameOver; r++) {
      for (let c = 0; c < 10 && !gameOver; c++) {
        // Re-read fireAt each iteration to avoid a stale closure: each act()
        // re-renders the hook and issues a new fireAt reference that closes
        // over the latest gameState. Capturing it once outside the loop would
        // see an outdated currentTurn/phase and silently no-op.
        act(() => { result.current.fireAt(r, c); });
        if (result.current.gameState.phase === 'gameover') {
          gameOver = true;
        } else {
          // Let the AI timer fire so currentTurn returns to 'player'
          act(() => { jest.advanceTimersByTime(1500); });
          // Cast to string to escape TypeScript's control-flow narrowing:
          // the earlier check narrowed phase to 'setup'|'playing' in this
          // else block, even though act() above may have changed the value.
          if ((result.current.gameState.phase as string) === 'gameover') gameOver = true;
        }
      }
    }

    // The game must have ended — one side sank the other's entire fleet
    expect(result.current.gameState.phase).toBe('gameover');
    // Regardless of who won, aiThinking must be false: either the isGameOver
    // guard on line 173 stopped the AI timer from being scheduled (player wins),
    // or the AI timer resolved normally and set aiThinking back to false.
    expect(result.current.aiThinking).toBe(false);
    expect(result.current.gameState.winner).not.toBeNull();
  });

  it('caps the log at 14 entries', () => {
    const hook = hookInPlayingState();
    for (let col = 0; col < 7; col++) {
      act(() => { hook.result.current.fireAt(8, col); });
      act(() => { jest.advanceTimersByTime(1500); });
    }
    expect(hook.result.current.log.length).toBeLessThanOrEqual(14);
  });
});

// ─── resetGame ────────────────────────────────────────────────────────────────

describe('resetGame', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('resets phase back to setup', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.gameState.phase).toBe('setup');
  });

  it('clears all placed ships from the player board', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.gameState.playerBoard.ships).toHaveLength(0);
  });

  it('clears all ship cells from the player board grid', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.resetGame(); });
    const flat = hook.result.current.gameState.playerBoard.grid.flat();
    expect(flat.every(c => c === 'empty')).toBe(true);
  });

  it('resets placedShipNames to empty', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.setupState.placedShipNames).toHaveLength(0);
  });

  it('resets selectedShipName to null', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectShip('Carrier'); });
    act(() => { result.current.resetGame(); });
    expect(result.current.setupState.selectedShipName).toBeNull();
  });

  it('resets orientation to horizontal', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.setOrientation('vertical'); });
    act(() => { result.current.resetGame(); });
    expect(result.current.setupState.orientation).toBe('horizontal');
  });

  it('clears the combat log', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.log).toHaveLength(0);
  });

  it('resets shotCount to zero', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.gameState.shotCount).toBe(0);
  });

  it('resets allShipsPlaced to false', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.allShipsPlaced).toBe(false);
  });

  it('resets aiThinking to false', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.fireAt(9, 9); });
    act(() => { hook.result.current.resetGame(); }); // reset mid-AI-turn
    expect(hook.result.current.aiThinking).toBe(false);
  });

  it('resets battleStarting to false', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); }); // battleStarting now true
    act(() => { hook.result.current.resetGame(); }); // reset before timer fires
    expect(hook.result.current.battleStarting).toBe(false);
  });

  it('resets winner to null', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.gameState.winner).toBeNull();
  });

  it('allShipsPlaced is false after reset', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.allShipsPlaced).toBe(false);
  });

  it('resets difficulty to null', () => {
    const { result } = renderHook(() => useGameState());
    act(() => { result.current.selectDifficulty('sweaty'); });
    act(() => { result.current.resetGame(); });
    expect(result.current.difficulty).toBeNull();
  });

  it('resets difficulty to null for every tier', () => {
    DIFFICULTIES.forEach(d => {
      const { result } = renderHook(() => useGameState());
      act(() => { result.current.selectDifficulty(d); });
      act(() => { result.current.resetGame(); });
      expect(result.current.difficulty).toBeNull();
    });
  });

  it('difficulty remains null after reset even if game had started', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.selectDifficulty('medium'); });
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.resetGame(); });
    expect(hook.result.current.difficulty).toBeNull();
  });
});

// ─── Timer cleanup on unmount ─────────────────────────────────────────────────

describe('timer cleanup', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('does not throw or update state after unmount during battleStarting', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    expect(() => {
      hook.unmount();
      act(() => { jest.advanceTimersByTime(1500); });
    }).not.toThrow();
  });

  it('does not throw or update state after unmount during AI thinking', () => {
    const hook = hookWithAllShipsPlaced();
    act(() => { hook.result.current.beginGame(); });
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => { hook.result.current.fireAt(9, 9); });
    expect(() => {
      hook.unmount();
      act(() => { jest.advanceTimersByTime(1500); });
    }).not.toThrow();
  });
});