import { createGame, startGame, playerAttack, isGameOver } from '../models/Game';
import { placeShip } from '../models/Board';
import { createShip } from '../models/Ship';

describe('Game', () => {
  it('initializes with setup phase', () => {
    const state = createGame();
    expect(state.phase).toBe('setup');
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
  });

  it('transitions to playing phase on start', () => {
    const state = startGame(createGame());
    expect(state.phase).toBe('playing');
    expect(state.currentTurn).toBe('player');
  });

  it('player attack increments turn count', () => {
    let state = startGame(createGame());
    const ship = createShip('Destroyer', 2);
    state.opponentBoard = placeShip(state.opponentBoard, ship, 0, 0, 'horizontal')!;
    const { state: after } = playerAttack(state, 5, 5);
    expect(after.turnCount).toBe(1);
  });

  it('detects player win when all opponent ships sunk', () => {
    let state = startGame(createGame());
    const ship = createShip('Destroyer', 2);
    state.opponentBoard = placeShip(state.opponentBoard, ship, 0, 0, 'horizontal')!;
    let result = playerAttack(state, 0, 0);
    result = playerAttack(result.state, 0, 1);
    expect(isGameOver(result.state)).toBe(true);
    expect(result.state.winner).toBe('player');
  });
});