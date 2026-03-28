import {
  createGame,
  startGame,
  playerAttack,
  opponentAttack,
  removeShipFromBoard,
  isGameOver,
} from '../models/Game';
import { placeShip } from '../models/Board';
import { createShip } from '../models/Ship';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function playingGameWithShips() {
  let state = startGame(createGame());
  const playerShip   = createShip('Destroyer', 2);
  const opponentShip = createShip('Destroyer', 2);
  state = {
    ...state,
    playerBoard:   placeShip(state.playerBoard,   playerShip,   0, 0, 'horizontal')!,
    opponentBoard: placeShip(state.opponentBoard, opponentShip, 0, 0, 'horizontal')!,
  };
  return state;
}

// ─── createGame ───────────────────────────────────────────────────────────────

describe('createGame', () => {
  it('initializes in setup phase', () => {
    expect(createGame().phase).toBe('setup');
  });

  it('initializes with no winner', () => {
    expect(createGame().winner).toBeNull();
  });

  it('initializes shotCount at zero', () => {
    expect(createGame().shotCount).toBe(0);
  });

  it('initializes turnCount at zero', () => {
    expect(createGame().turnCount).toBe(0);
  });

  it('initializes with empty player and opponent boards', () => {
    const { playerBoard, opponentBoard } = createGame();
    expect(playerBoard.ships).toHaveLength(0);
    expect(opponentBoard.ships).toHaveLength(0);
  });

  it('initializes with player as current turn', () => {
    expect(createGame().currentTurn).toBe('player');
  });
});

// ─── startGame ────────────────────────────────────────────────────────────────

describe('startGame', () => {
  it('transitions phase to playing', () => {
    expect(startGame(createGame()).phase).toBe('playing');
  });

  it('sets currentTurn to player', () => {
    expect(startGame(createGame()).currentTurn).toBe('player');
  });

  it('preserves board state from setup', () => {
    let state = createGame();
    const ship = createShip('Destroyer', 2);
    state = { ...state, playerBoard: placeShip(state.playerBoard, ship, 0, 0, 'horizontal')! };
    const started = startGame(state);
    expect(started.playerBoard.ships).toHaveLength(1);
  });

  it('does not mutate the input state', () => {
    const state   = createGame();
    startGame(state);
    expect(state.phase).toBe('setup');
  });
});

// ─── playerAttack ─────────────────────────────────────────────────────────────

describe('playerAttack', () => {
  it('increments shotCount on a valid miss', () => {
    const state      = playingGameWithShips();
    const { state: after } = playerAttack(state, 9, 9); // empty cell
    expect(after.shotCount).toBe(1);
  });

  it('increments shotCount on a valid hit', () => {
    const state      = playingGameWithShips();
    const { state: after } = playerAttack(state, 0, 0); // hits Destroyer
    expect(after.shotCount).toBe(1);
  });

  it('does NOT increment shotCount on already-attacked cell', () => {
    let state = playingGameWithShips();
    state = playerAttack(state, 9, 9).state;
    const { state: after } = playerAttack(state, 9, 9); // repeat
    expect(after.shotCount).toBe(1);
  });

  it('switches turn to opponent after a miss', () => {
    const state      = playingGameWithShips();
    const { state: after } = playerAttack(state, 9, 9);
    expect(after.currentTurn).toBe('opponent');
  });

  it('switches turn to opponent after a hit (game not over)', () => {
    const state      = playingGameWithShips();
    const { state: after } = playerAttack(state, 0, 0); // partial hit
    expect(after.currentTurn).toBe('opponent');
  });

  it('sets winner to player and phase to gameover when last ship sunk', () => {
    let state  = playingGameWithShips();
    state      = playerAttack(state, 0, 0).state;
    const { state: final } = playerAttack(state, 0, 1);
    expect(final.phase).toBe('gameover');
    expect(final.winner).toBe('player');
  });

  it('returns already-attacked outcome without mutating state', () => {
    let state = playingGameWithShips();
    state     = playerAttack(state, 5, 5).state;
    const { state: after, outcome } = playerAttack(state, 5, 5);
    expect(outcome.result).toBe('already-attacked');
    expect(after.shotCount).toBe(1); // not incremented again
  });

  it('does not mutate input state', () => {
    const state = playingGameWithShips();
    playerAttack(state, 0, 0);
    expect(state.shotCount).toBe(0);
    expect(state.opponentBoard.grid[0][0]).toBe('ship');
  });

  it('outcome.result is hit on a ship cell', () => {
    const state      = playingGameWithShips();
    const { outcome } = playerAttack(state, 0, 0);
    expect(outcome.result).toBe('hit');
  });

  it('outcome.result is miss on an empty cell', () => {
    const state      = playingGameWithShips();
    const { outcome } = playerAttack(state, 9, 9);
    expect(outcome.result).toBe('miss');
  });
});

// ─── opponentAttack ───────────────────────────────────────────────────────────

describe('opponentAttack', () => {
  it('does NOT increment shotCount (AI moves are not player shots)', () => {
    const state      = playingGameWithShips();
    const { state: after } = opponentAttack(state, 9, 9);
    expect(after.shotCount).toBe(0);
  });

  it('does NOT increment shotCount on a hit', () => {
    const state      = playingGameWithShips();
    const { state: after } = opponentAttack(state, 0, 0); // hits Destroyer
    expect(after.shotCount).toBe(0);
  });

  it('switches turn back to player after attack', () => {
    const state      = playingGameWithShips();
    const { state: after } = opponentAttack(state, 9, 9);
    expect(after.currentTurn).toBe('player');
  });

  it('sets winner to opponent and phase to gameover when last player ship sunk', () => {
    let state  = playingGameWithShips();
    state      = opponentAttack(state, 0, 0).state;
    const { state: final } = opponentAttack(state, 0, 1); // sinks Destroyer
    expect(final.phase).toBe('gameover');
    expect(final.winner).toBe('opponent');
  });

  it('does not mutate input state', () => {
    const state = playingGameWithShips();
    opponentAttack(state, 0, 0);
    expect(state.shotCount).toBe(0);
    expect(state.playerBoard.grid[0][0]).toBe('ship');
  });

  it('outcome.result is hit when attacking a player ship cell', () => {
    const state      = playingGameWithShips();
    const { outcome } = opponentAttack(state, 0, 0);
    expect(outcome.result).toBe('hit');
  });

  it('outcome.result is miss when attacking an empty player cell', () => {
    const state      = playingGameWithShips();
    const { outcome } = opponentAttack(state, 9, 9);
    expect(outcome.result).toBe('miss');
  });

  it('only playerAttack increments shotCount — opponentAttack does not', () => {
    let state = playingGameWithShips();
    state     = playerAttack(state,   9, 9).state; // shotCount → 1
    state     = opponentAttack(state, 9, 8).state; // shotCount unchanged
    expect(state.shotCount).toBe(1);
  });
});

// ─── removeShipFromBoard ──────────────────────────────────────────────────────

describe('removeShipFromBoard', () => {
  function stateWithPlacedShip() {
    let state = createGame();
    const ship = createShip('Destroyer', 2);
    state = { ...state, playerBoard: placeShip(state.playerBoard, ship, 3, 3, 'horizontal')! };
    return state;
  }

  it('removes the named ship from the ships array', () => {
    const state  = stateWithPlacedShip();
    const after  = removeShipFromBoard(state, 'Destroyer');
    expect(after.playerBoard.ships).toHaveLength(0);
  });

  it('clears the ship cells back to empty in the grid', () => {
    const state  = stateWithPlacedShip();
    const after  = removeShipFromBoard(state, 'Destroyer');
    expect(after.playerBoard.grid[3][3]).toBe('empty');
    expect(after.playerBoard.grid[3][4]).toBe('empty');
  });

  it('returns state unchanged when the ship name does not exist', () => {
    const state  = stateWithPlacedShip();
    const after  = removeShipFromBoard(state, 'Nonexistent');
    expect(after).toBe(state); // referential equality — same object
  });

  it('returns state unchanged when the board has no ships at all', () => {
    const state = createGame();
    const after = removeShipFromBoard(state, 'Destroyer');
    expect(after).toBe(state);
  });

  it('does not affect other ships on the board', () => {
    let state = createGame();
    const s1  = createShip('Destroyer', 2);
    const s2  = createShip('Cruiser',   3);
    state = { ...state, playerBoard: placeShip(state.playerBoard, s1, 0, 0, 'horizontal')! };
    state = { ...state, playerBoard: placeShip(state.playerBoard, s2, 2, 0, 'horizontal')! };
    const after = removeShipFromBoard(state, 'Destroyer');
    expect(after.playerBoard.ships).toHaveLength(1);
    expect(after.playerBoard.ships[0].name).toBe('Cruiser');
    expect(after.playerBoard.grid[2][0]).toBe('ship'); // Cruiser cells untouched
  });

  it('does not mutate the original state', () => {
    const state = stateWithPlacedShip();
    removeShipFromBoard(state, 'Destroyer');
    expect(state.playerBoard.ships).toHaveLength(1);
    expect(state.playerBoard.grid[3][3]).toBe('ship');
  });

  it('only removes from playerBoard, not opponentBoard', () => {
    let state = createGame();
    const ship = createShip('Destroyer', 2);
    // Place on opponent board manually to confirm it is untouched
    state = {
      ...state,
      playerBoard:   placeShip(state.playerBoard,   ship, 0, 0, 'horizontal')!,
      opponentBoard: placeShip(state.opponentBoard, createShip('Destroyer', 2), 5, 5, 'horizontal')!,
    };
    const after = removeShipFromBoard(state, 'Destroyer');
    expect(after.opponentBoard.ships).toHaveLength(1);
    expect(after.opponentBoard.grid[5][5]).toBe('ship');
  });
});

// ─── isGameOver ───────────────────────────────────────────────────────────────

describe('isGameOver', () => {
  it('returns false for setup phase', () => {
    expect(isGameOver(createGame())).toBe(false);
  });

  it('returns false for playing phase', () => {
    expect(isGameOver(startGame(createGame()))).toBe(false);
  });

  it('returns true for gameover phase', () => {
    const state = { ...createGame(), phase: 'gameover' as const };
    expect(isGameOver(state)).toBe(true);
  });
});