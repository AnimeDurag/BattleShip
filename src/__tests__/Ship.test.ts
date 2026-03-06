import { createShip, hitShip, shipOccupiesCell } from '../models/Ship';

describe('Ship', () => {
  it('creates a ship with correct properties', () => {
    const ship = createShip('Carrier', 5);
    expect(ship.name).toBe('Carrier');
    expect(ship.size).toBe(5);
    expect(ship.hits.size).toBe(0);
    expect(ship.sunk).toBe(false);
  });

  it('records a hit on a ship', () => {
    const ship = createShip('Destroyer', 2);
    const hit = hitShip(ship, 0, 0);
    expect(hit.hits.size).toBe(1);
    expect(hit.sunk).toBe(false);
  });

  it('sinks a ship when all cells are hit', () => {
    let ship = createShip('Destroyer', 2);
    ship = hitShip(ship, 0, 0);
    ship = hitShip(ship, 0, 1);
    expect(ship.sunk).toBe(true);
  });

  it('checks if a ship occupies a cell', () => {
    let ship = createShip('Destroyer', 2);
    ship = { ...ship, cells: [[0, 0], [0, 1]] };
    expect(shipOccupiesCell(ship, 0, 0)).toBe(true);
    expect(shipOccupiesCell(ship, 1, 0)).toBe(false);
  });
});