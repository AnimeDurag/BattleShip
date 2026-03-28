/**
 * FleetRoster component tests
 *
 * Tests the visual block-based display for player and enemy fleets.
 *
 * Design contract:
 *   Player fleet  — always shows blocks; hit cells red, sunk cells orange
 *   Enemy fleet   — blocks hidden until the ship is contacted (hit or sunk)
 *                 — once contacted: hit cells red, rest amber
 *                 — once sunk: all cells orange + "SUNK" label
 *
 * Required jest config: testEnvironment: 'jsdom'
 * Required packages:    @testing-library/react  @testing-library/jest-dom
 */

import { render, screen } from '@testing-library/react';
import FleetRoster from '../components/FleetRoster';
import type { Ship } from '../models/types';
import { FLEET } from '../utils/constants';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Build a minimal Ship stub. `cells` and `hits` are the fields FleetRoster reads. */
function makeShip(
  name: string,
  size: number,
  hitCoords: string[] = [],
  sunk = false
): Ship {
  return {
    id:    name.toLowerCase().replace(/\s+/g, '-'),
    name,
    size,
    cells: [],               // FleetRoster never reads individual cell coords
    hits:  new Set(hitCoords),
    sunk,
  };
}

const NO_SHIPS: Ship[] = [];

function allFleetShips(overrides: Partial<Record<string, Ship>> = {}): Ship[] {
  return FLEET.map(def => {
    if (overrides[def.name]) return overrides[def.name] as Ship;
    return makeShip(def.name, def.size);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderRoster(ships: Ship[], label: string, enemy = false) {
  return render(
    <FleetRoster ships={ships} label={label} enemy={enemy} />
  );
}

/** Count DOM elements matching a selector within the rendered container. */
function countBlocks(container: HTMLElement, selector: string): number {
  return container.querySelectorAll(selector).length;
}

// ─── Label rendering ──────────────────────────────────────────────────────────

describe('FleetRoster — panel label', () => {
  it('renders the provided label', () => {
    renderRoster(NO_SHIPS, 'YOUR FLEET');
    expect(screen.getByText('YOUR FLEET')).toBeDefined();
  });

  it('renders enemy label correctly', () => {
    renderRoster(NO_SHIPS, 'ENEMY FLEET', true);
    expect(screen.getByText('ENEMY FLEET')).toBeDefined();
  });
});

// ─── Ship name display ────────────────────────────────────────────────────────

describe('FleetRoster — ship names', () => {
  it('shows all five ship names from FLEET', () => {
    renderRoster(allFleetShips(), 'YOUR FLEET');
    FLEET.forEach(def => {
      expect(screen.getByText(def.name)).toBeDefined();
    });
  });

  it('shows ship names even when no ships have been discovered (enemy)', () => {
    renderRoster(NO_SHIPS, 'ENEMY FLEET', true);
    FLEET.forEach(def => {
      expect(screen.getByText(def.name)).toBeDefined();
    });
  });
});

// ─── Player fleet — always shows blocks ──────────────────────────────────────

describe('FleetRoster — player fleet (enemy=false)', () => {
  it('shows blocks for every ship even with no hits', () => {
    const { container } = renderRoster(allFleetShips(), 'YOUR FLEET');
    // Total blocks = sum of fleet sizes = 5+4+3+3+2 = 17
    const totalSize = FLEET.reduce((s, f) => s + f.size, 0);
    expect(countBlocks(container, '.fleet-roster__block')).toBe(totalSize);
  });

  it('applies hit modifier to blocks up to the hit count', () => {
    const ships = allFleetShips({
      Destroyer: makeShip('Destroyer', 2, ['0,0']), // 1 of 2 hit
    });
    const { container } = renderRoster(ships, 'YOUR FLEET');
    expect(countBlocks(container, '.fleet-roster__block--hit')).toBe(1);
  });

  it('applies sunk modifier to all blocks when ship is sunk', () => {
    const ships = allFleetShips({
      Destroyer: makeShip('Destroyer', 2, ['0,0', '0,1'], true),
    });
    const { container } = renderRoster(ships, 'YOUR FLEET');
    expect(countBlocks(container, '.fleet-roster__block--sunk')).toBe(2);
  });

  it('shows SUNK label when ship is sunk', () => {
    const ships = allFleetShips({
      Destroyer: makeShip('Destroyer', 2, ['0,0', '0,1'], true),
    });
    renderRoster(ships, 'YOUR FLEET');
    expect(screen.getByText('SUNK')).toBeDefined();
  });

  it('does not show SUNK label for ships that are still afloat', () => {
    renderRoster(allFleetShips(), 'YOUR FLEET');
    expect(screen.queryByText('SUNK')).toBeNull();
  });

  it('shows blocks for a partially hit carrier (3 of 5 hit)', () => {
    const ships = allFleetShips({
      Carrier: makeShip('Carrier', 5, ['0,0', '0,1', '0,2']), // 3 hit
    });
    const { container } = renderRoster(ships, 'YOUR FLEET');
    expect(countBlocks(container, '.fleet-roster__block--hit')).toBe(3);
  });
});

// ─── Enemy fleet — unknown (uncontacted) ships ───────────────────────────────

describe('FleetRoster — enemy fleet (enemy=true) — uncontacted ships', () => {
  it('shows NO blocks for ships with zero hits', () => {
    const { container } = renderRoster(NO_SHIPS, 'ENEMY FLEET', true);
    expect(countBlocks(container, '.fleet-roster__block')).toBe(0);
  });

  it('shows no blocks even when some ships are discovered but this one is not', () => {
    // Only Destroyer hit — other 4 ships should have no blocks
    const { container } = renderRoster(
      [makeShip('Destroyer', 2, ['9,9'])],
      'ENEMY FLEET',
      true
    );
    const totalSize = FLEET.reduce((s, f) => s + f.size, 0);
    // Only Destroyer's 2 blocks should appear (1 hit + 1 intact)
    expect(countBlocks(container, '.fleet-roster__block')).toBe(2);
    expect(countBlocks(container, '.fleet-roster__block')).toBeLessThan(totalSize);
  });

  it('does not render "UNKNOWN" text (replaced by hidden blocks)', () => {
    renderRoster(NO_SHIPS, 'ENEMY FLEET', true);
    expect(screen.queryByText('UNKNOWN')).toBeNull();
  });

  it('does not render hit-fraction text (e.g. "1/4 HIT") for partially hit ships', () => {
    renderRoster(
      [makeShip('Battleship', 4, ['1,0'])],
      'ENEMY FLEET',
      true
    );
    expect(screen.queryByText(/HIT/)).toBeNull();
  });
});

// ─── Enemy fleet — contacted (hit) ships ─────────────────────────────────────

describe('FleetRoster — enemy fleet (enemy=true) — contacted ships', () => {
  it('reveals blocks once a ship has been hit', () => {
    const { container } = renderRoster(
      [makeShip('Destroyer', 2, ['0,0'])],
      'ENEMY FLEET',
      true
    );
    expect(countBlocks(container, '.fleet-roster__block')).toBe(2);
  });

  it('marks only the hit block(s) with the hit modifier', () => {
    const { container } = renderRoster(
      [makeShip('Battleship', 4, ['1,0'])], // 1 of 4 hit
      'ENEMY FLEET',
      true
    );
    expect(countBlocks(container, '.fleet-roster__block--hit')).toBe(1);
    // Total blocks for Battleship = 4; 1 hit + 3 intact
    expect(countBlocks(container, '.fleet-roster__block')).toBe(4);
  });

  it('marks two hit blocks correctly on a partially hit Carrier', () => {
    const { container } = renderRoster(
      [makeShip('Carrier', 5, ['0,0', '0,1'])], // 2 of 5 hit
      'ENEMY FLEET',
      true
    );
    expect(countBlocks(container, '.fleet-roster__block--hit')).toBe(2);
    expect(countBlocks(container, '.fleet-roster__block')).toBe(5);
  });

  it('keeps other ships\' blocks hidden when only one ship is contacted', () => {
    const { container } = renderRoster(
      [makeShip('Destroyer', 2, ['9,9'])],
      'ENEMY FLEET',
      true
    );
    // Only Destroyer (size 2) should have blocks; 4 other ships hidden
    expect(countBlocks(container, '.fleet-roster__block')).toBe(2);
  });

  it('multiple contacted ships each show their own blocks', () => {
    const { container } = renderRoster(
      [
        makeShip('Carrier',    5, ['0,0', '0,1']),   // 2 hit
        makeShip('Destroyer',  2, ['9,8']),            // 1 hit
      ],
      'ENEMY FLEET',
      true
    );
    // Carrier: 5 blocks, Destroyer: 2 blocks = 7 total
    expect(countBlocks(container, '.fleet-roster__block')).toBe(7);
    expect(countBlocks(container, '.fleet-roster__block--hit')).toBe(3); // 2 + 1
  });
});

// ─── Enemy fleet — sunk ships ─────────────────────────────────────────────────

describe('FleetRoster — enemy fleet (enemy=true) — sunk ships', () => {
  it('reveals blocks for a sunk ship', () => {
    const { container } = renderRoster(
      [makeShip('Destroyer', 2, ['0,0', '0,1'], true)],
      'ENEMY FLEET',
      true
    );
    expect(countBlocks(container, '.fleet-roster__block')).toBe(2);
  });

  it('applies sunk modifier to all blocks of the sunk ship', () => {
    const { container } = renderRoster(
      [makeShip('Destroyer', 2, ['0,0', '0,1'], true)],
      'ENEMY FLEET',
      true
    );
    expect(countBlocks(container, '.fleet-roster__block--sunk')).toBe(2);
    expect(countBlocks(container, '.fleet-roster__block--hit')).toBe(0);
  });

  it('shows SUNK label for a sunk enemy ship', () => {
    renderRoster(
      [makeShip('Battleship', 4, ['0,0','0,1','0,2','0,3'], true)],
      'ENEMY FLEET',
      true
    );
    expect(screen.getByText('SUNK')).toBeDefined();
  });

  it('applies sunk modifier to all 5 Carrier blocks', () => {
    const { container } = renderRoster(
      [makeShip('Carrier', 5, ['0,0','0,1','0,2','0,3','0,4'], true)],
      'ENEMY FLEET',
      true
    );
    expect(countBlocks(container, '.fleet-roster__block--sunk')).toBe(5);
  });

  it('sunk ships show sunk blocks while uncontacted ships remain hidden', () => {
    const { container } = renderRoster(
      [makeShip('Destroyer', 2, ['9,8','9,9'], true)],
      'ENEMY FLEET',
      true
    );
    // Only Destroyer blocks (2) should appear; other 4 ships hidden
    expect(countBlocks(container, '.fleet-roster__block')).toBe(2);
    expect(countBlocks(container, '.fleet-roster__block--sunk')).toBe(2);
  });

  it('multiple sunk ships each show all sunk blocks', () => {
    const { container } = renderRoster(
      [
        makeShip('Destroyer', 2, ['9,8','9,9'], true),
        makeShip('Cruiser',   3, ['1,0','1,1','1,2'], true),
      ],
      'ENEMY FLEET',
      true
    );
    // 2 + 3 = 5 sunk blocks total
    expect(countBlocks(container, '.fleet-roster__block--sunk')).toBe(5);
    expect(countBlocks(container, '.fleet-roster__block')).toBe(5);
  });
});

// ─── Mixed state — some sunk, some hit, some unknown ─────────────────────────

describe('FleetRoster — enemy fleet — mixed states', () => {
  it('correctly renders all three states simultaneously', () => {
    const { container } = renderRoster(
      [
        makeShip('Carrier',    5, ['0,0','0,1','0,2','0,3','0,4'], true), // sunk
        makeShip('Battleship', 4, ['1,0', '1,1']),                         // 2 hits
        // Cruiser, Submarine, Destroyer: not contacted — no blocks
      ],
      'ENEMY FLEET',
      true
    );
    // 5 sunk + 4 battleship = 9 total blocks; Cruiser/Sub/Destroyer hidden
    expect(countBlocks(container, '.fleet-roster__block')).toBe(9);
    expect(countBlocks(container, '.fleet-roster__block--sunk')).toBe(5);
    expect(countBlocks(container, '.fleet-roster__block--hit')).toBe(2);
  });

  it('shows SUNK label only for the sunk ship', () => {
    renderRoster(
      [
        makeShip('Carrier',    5, ['0,0','0,1','0,2','0,3','0,4'], true),
        makeShip('Battleship', 4, ['1,0']),
      ],
      'ENEMY FLEET',
      true
    );
    const sunkLabels = screen.getAllByText('SUNK');
    expect(sunkLabels).toHaveLength(1);
  });
});