import { GameState, AttackOutcome, CellState } from './types';
import { createBoard, receiveAttack, allShipsSunk } from './Board';

// Initializes a brand new game state
export function createGame(): GameState {
  return {
    phase: 'setup',
    playerBoard: createBoard(),
    opponentBoard: createBoard(),
    currentTurn: 'player',
    winner: null,
    turnCount: 0,
  };
}

// Transitions the game from setup → playing once both boards are ready
export function startGame(state: GameState): GameState {
  return {
    ...state,
    phase: 'playing',
    currentTurn: 'player',
  };
}

// Removes a ship from the player board by name, clearing its cells back to
// empty. Used during setup to reposition a ship that has already been placed.
// Exported so both the React hook and future CLI/multiplayer flows share one
// implementation.
export function removeShipFromBoard(
  state: GameState,
  shipName: string
): GameState {
  const board = state.playerBoard;
  const ship  = board.ships.find(s => s.name === shipName);
  if (!ship) return state;

  const newGrid = board.grid.map(r => [...r]) as CellState[][];
  ship.cells.forEach(([r, c]) => { newGrid[r][c] = 'empty'; });

  return {
    ...state,
    playerBoard: {
      grid: newGrid,
      ships: board.ships.filter(s => s.name !== shipName),
    },
  };
}

// Processes a player attack on the opponent board.
// Increments turnCount on every valid player move.
export function playerAttack(
  state: GameState,
  row: number,
  col: number
): { state: GameState; outcome: AttackOutcome } {
  const { board: updatedOpponentBoard, outcome } = receiveAttack(
    state.opponentBoard,
    row,
    col
  );

  if (outcome.result === 'already-attacked') {
    return { state, outcome };
  }

  const playerWon = allShipsSunk(updatedOpponentBoard);

  const newState: GameState = {
    ...state,
    opponentBoard: updatedOpponentBoard,
    phase:        playerWon ? 'gameover'  : 'playing',
    winner:       playerWon ? 'player'    : null,
    currentTurn:  playerWon ? 'player'    : 'opponent',
    turnCount:    state.turnCount + 1,
  };

  return { state: newState, outcome };
}

// Processes an AI attack on the player board.
// Also increments turnCount so the counter reflects total rounds elapsed,
// not just player moves — making defeat screen messaging accurate.
export function opponentAttack(
  state: GameState,
  row: number,
  col: number
): { state: GameState; outcome: AttackOutcome } {
  const { board: updatedPlayerBoard, outcome } = receiveAttack(
    state.playerBoard,
    row,
    col
  );

  const opponentWon = allShipsSunk(updatedPlayerBoard);

  const newState: GameState = {
    ...state,
    playerBoard:  updatedPlayerBoard,
    phase:        opponentWon ? 'gameover'  : 'playing',
    winner:       opponentWon ? 'opponent'  : null,
    currentTurn:  opponentWon ? 'opponent'  : 'player',
    turnCount:    state.turnCount + 1,
  };

  return { state: newState, outcome };
}

// Returns true if the game is over
export function isGameOver(state: GameState): boolean {
  return state.phase === 'gameover';
}