import { createBoard, placeShip, receiveAttack, allShipsSunk } from '../models/Board';
import { createShip } from '../models/Ship';

describe('Board', () => {
  it('creates an empty 10x10 board', () => {
    const board = createBoard();
    expect(board.grid.length).toBe(10);
    expect(board.grid[0].length).toBe(10);
    expect(board.ships.length).toBe(0);
    board.grid.forEach(row => row.forEach(cell => expect(cell).toBe('empty')));
  });

  it('places a ship horizontally', () => {
    const board = createBoard();
    const ship = createShip('Destroyer', 2);
    const result = placeShip(board, ship, 0, 0, 'horizontal');
    expect(result).not.toBeNull();
    expect(result!.grid[0][0]).toBe('ship');
    expect(result!.grid[0][1]).toBe('ship');
  });

  it('places a ship vertically', () => {
    const board = createBoard();
    const ship = createShip('Destroyer', 2);
    const result = placeShip(board, ship, 0, 0, 'vertical');
    expect(result).not.toBeNull();
    expect(result!.grid[0][0]).toBe('ship');
    expect(result!.grid[1][0]).toBe('ship');
  });

  it('rejects out-of-bounds placement', () => {
    const board = createBoard();
    const ship = createShip('Carrier', 5);
    const result = placeShip(board, ship, 0, 8, 'horizontal');
    expect(result).toBeNull();
  });

  it('rejects overlapping placement', () => {
    let board = createBoard();
    const ship1 = createShip('Destroyer', 2);
    const ship2 = createShip('Submarine', 3);
    board = placeShip(board, ship1, 0, 0, 'horizontal')!;
    const result = placeShip(board, ship2, 0, 0, 'vertical');
    expect(result).toBeNull();
  });

  it('records a miss correctly', () => {
    const board = createBoard();
    const { board: updated, outcome } = receiveAttack(board, 0, 0);
    expect(outcome.result).toBe('miss');
    expect(updated.grid[0][0]).toBe('miss');
  });

  it('records a hit correctly', () => {
    let board = createBoard();
    const ship = createShip('Destroyer', 2);
    board = placeShip(board, ship, 0, 0, 'horizontal')!;
    const { board: updated, outcome } = receiveAttack(board, 0, 0);
    expect(outcome.result).toBe('hit');
    expect(updated.grid[0][0]).toBe('hit');
  });

  it('records a sunk ship correctly', () => {
    let board = createBoard();
    const ship = createShip('Destroyer', 2);
    board = placeShip(board, ship, 0, 0, 'horizontal')!;
    let result = receiveAttack(board, 0, 0);
    result = receiveAttack(result.board, 0, 1);
    expect(result.outcome.result).toBe('sunk');
    expect(result.board.grid[0][0]).toBe('sunk');
    expect(result.board.grid[0][1]).toBe('sunk');
  });

  it('prevents attacking the same cell twice', () => {
    const board = createBoard();
    const { board: updated } = receiveAttack(board, 3, 3);
    const { outcome } = receiveAttack(updated, 3, 3);
    expect(outcome.result).toBe('already-attacked');
  });

  it('detects all ships sunk', () => {
    let board = createBoard();
    const ship = createShip('Destroyer', 2);
    board = placeShip(board, ship, 0, 0, 'horizontal')!;
    let result = receiveAttack(board, 0, 0);
    result = receiveAttack(result.board, 0, 1);
    expect(allShipsSunk(result.board)).toBe(true);
  });
});