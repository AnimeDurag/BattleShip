import { createShip, hitShip, shipOccupiesCell } from '../models/Ship';

describe('createShip', () => {
  it('creates a ship with correct name and size', () => {
    const ship = createShip('Carrier', 5);
    expect(ship.name).toBe('Carrier');
    expect(ship.size).toBe(5);
  });

  it('starts with no hits and not sunk', () => {
    const ship = createShip('Destroyer', 2);
    expect(ship.hits.size).toBe(0);
    expect(ship.sunk).toBe(false);
  });

  it('starts with no cells placed', () => {
    const ship = createShip('Cruiser', 3);
    expect(ship.cells).toHaveLength(0);
  });

  it('derives id from name — single word', () => {
    const ship = createShip('Carrier', 5);
    expect(ship.id).toBe('carrier');
  });

  it('derives id from name — multi-word with spaces', () => {
    const ship = createShip('Patrol Boat', 2);
    expect(ship.id).toBe('patrol-boat');
  });

  it('derives id from name — multiple consecutive spaces collapsed to one dash', () => {
    const ship = createShip('Super  Carrier', 6);
    expect(ship.id).toBe('super-carrier'); // \s+ matches the whole run, not each space
  });

  it('each createShip call produces an independent hits Set', () => {
    const a = createShip('Destroyer', 2);
    const b = createShip('Destroyer', 2);
    hitShip(a, 0, 0); // mutate a's copy — should not affect b
    expect(b.hits.size).toBe(0);
  });
});

describe('hitShip', () => {
  it('records a hit and leaves ship afloat when not all cells hit', () => {
    const ship = createShip('Destroyer', 2);
    const hit  = hitShip(ship, 0, 0);
    expect(hit.hits.size).toBe(1);
    expect(hit.hits.has('0,0')).toBe(true);
    expect(hit.sunk).toBe(false);
  });

  it('sinks the ship when the last cell is hit', () => {
    let ship = createShip('Destroyer', 2);
    ship = hitShip(ship, 0, 0);
    ship = hitShip(ship, 0, 1);
    expect(ship.sunk).toBe(true);
    expect(ship.hits.size).toBe(2);
  });

  it('sinks a size-1 ship on the first hit', () => {
    const ship   = createShip('Patrol', 1);
    const result = hitShip(ship, 3, 7);
    expect(result.sunk).toBe(true);
  });

  it('is immutable — does not mutate the original ship', () => {
    const original = createShip('Destroyer', 2);
    hitShip(original, 0, 0);
    expect(original.hits.size).toBe(0);
    expect(original.sunk).toBe(false);
  });

  it('hitting the same cell twice does not double-count hits', () => {
    let ship = createShip('Cruiser', 3);
    ship = hitShip(ship, 1, 1);
    ship = hitShip(ship, 1, 1); // duplicate
    expect(ship.hits.size).toBe(1);
    expect(ship.sunk).toBe(false);
  });

  it('records hits at boundary coordinates', () => {
    const ship  = createShip('Destroyer', 2);
    const hit   = hitShip(ship, 0, 0);
    const hit2  = hitShip(hit, 9, 9);
    expect(hit2.hits.has('0,0')).toBe(true);
    expect(hit2.hits.has('9,9')).toBe(true);
  });

  it('preserves all other ship properties on hit', () => {
    const original = createShip('Battleship', 4);
    const result   = hitShip(original, 2, 3);
    expect(result.name).toBe(original.name);
    expect(result.size).toBe(original.size);
    expect(result.id).toBe(original.id);
  });
});

describe('shipOccupiesCell', () => {
  it('returns true for a cell the ship occupies', () => {
    const ship = { ...createShip('Destroyer', 2), cells: [[0, 0], [0, 1]] as [number,number][] };
    expect(shipOccupiesCell(ship, 0, 0)).toBe(true);
    expect(shipOccupiesCell(ship, 0, 1)).toBe(true);
  });

  it('returns false for a cell the ship does not occupy', () => {
    const ship = { ...createShip('Destroyer', 2), cells: [[0, 0], [0, 1]] as [number,number][] };
    expect(shipOccupiesCell(ship, 1, 0)).toBe(false);
    expect(shipOccupiesCell(ship, 0, 2)).toBe(false);
  });

  it('returns false when the ship has no cells placed', () => {
    const ship = createShip('Destroyer', 2);
    expect(shipOccupiesCell(ship, 0, 0)).toBe(false);
  });

  it('handles boundary coordinates correctly', () => {
    const ship = { ...createShip('Destroyer', 2), cells: [[9, 9], [9, 8]] as [number,number][] };
    expect(shipOccupiesCell(ship, 9, 9)).toBe(true);
    expect(shipOccupiesCell(ship, 0, 0)).toBe(false);
  });
});