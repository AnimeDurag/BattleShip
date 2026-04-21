/**
 * SetupScreen component tests — session stats panel
 *
 * We test only the session stats panel since it is the new logic this file
 * covers. Orientation toggles, ship-selector interaction, and board rendering
 * are exercised end-to-end through useGameState.test.ts; duplicating them here
 * would add noise without adding coverage.
 *
 * Required jest config: testEnvironment: 'jsdom'
 * Required packages:    @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, within } from '@testing-library/react';
import SetupScreen from '../components/SetupScreen';
import { initialSessionStats, applyResult } from '../hooks/useSessionStats';
import type { SessionStats, GameResult } from '../hooks/useSessionStats';
import { createBoard } from '../models/Board';
import type { SetupState } from '../hooks/useGameState';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const emptySetupState: SetupState = {
  placedShipNames:  [],
  selectedShipName: null,
  orientation:      'horizontal',
};

function win(shots = 35): GameResult {
  return { winner: 'player', shotCount: shots, difficulty: 'medium' };
}

function loss(shots = 60): GameResult {
  return { winner: 'opponent', shotCount: shots, difficulty: 'medium' };
}

function makeStats(results: GameResult[]): SessionStats {
  return results.reduce(applyResult, initialSessionStats());
}

function renderSetup(sessionStats: SessionStats) {
  return render(
    <SetupScreen
      playerBoard={createBoard()}
      setupState={emptySetupState}
      allShipsPlaced={false}
      sessionStats={sessionStats}
      onSelectShip={() => {}}
      onSetOrientation={() => {}}
      onCellClick={() => {}}
      onRandomize={() => {}}
      onClearBoard={() => {}}
      onBeginGame={() => {}}
    />
  );
}

// ─── Hint text and ship selector branch coverage ─────────────────────────────
// Covers SetupScreen.tsx lines 54 (allShipsPlaced hint), 87 (placed/selected
// ship item classes), and 109-115 (Randomize + Launch Battle buttons).

describe('SetupScreen — hint text and ship selector', () => {
  it('shows "all ships deployed" hint when allShipsPlaced is true and no ship is selected', () => {
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: ['Carrier','Battleship','Cruiser','Submarine','Destroyer'], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={true}
        sessionStats={initialSessionStats()}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    expect(screen.getByText(/All ships deployed/)).toBeDefined();
  });

  it('marks a ship item as selected when selectedShipName matches', () => {
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: [], selectedShipName: 'Carrier', orientation: 'horizontal' }}
        allShipsPlaced={false}
        sessionStats={initialSessionStats()}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    const carrierItem = screen.getByText('Carrier').closest('.ship-selector__item');
    expect(carrierItem?.className).toContain('ship-selector__item--selected');
  });

  it('marks a ship item as placed when it is in placedShipNames', () => {
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: ['Destroyer'], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={false}
        sessionStats={initialSessionStats()}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    const destroyerItem = screen.getByText('Destroyer').closest('.ship-selector__item');
    expect(destroyerItem?.className).toContain('ship-selector__item--placed');
  });

  it('LAUNCH BATTLE button is enabled when allShipsPlaced is true', () => {
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: ['Carrier','Battleship','Cruiser','Submarine','Destroyer'], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={true}
        sessionStats={initialSessionStats()}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    const launchBtn = screen.getByText('► LAUNCH BATTLE');
    expect((launchBtn as HTMLButtonElement).disabled).toBe(false);
  });
});

// ─── Visibility guard ─────────────────────────────────────────────────────────

describe('SetupScreen — session stats panel visibility', () => {
  it('does not render the session panel when no games have been played', () => {
    renderSetup(initialSessionStats());
    expect(screen.queryByText('SESSION')).toBeNull();
  });

  it('renders the session panel after one win', () => {
    renderSetup(makeStats([win()]));
    expect(screen.getByText('SESSION')).toBeDefined();
  });

  it('renders the session panel after one loss', () => {
    renderSetup(makeStats([loss()]));
    expect(screen.getByText('SESSION')).toBeDefined();
  });

  it('renders the session panel after multiple mixed results', () => {
    renderSetup(makeStats([win(), loss(), win()]));
    expect(screen.getByText('SESSION')).toBeDefined();
  });
});

// ─── Wins / losses display ────────────────────────────────────────────────────

describe('SetupScreen — wins and losses values', () => {
  it('displays the correct win count', () => {
    const stats = makeStats([win(), win(), loss()]);
    renderSetup(stats);
    // WINS label should be present
    expect(screen.getByText('WINS')).toBeDefined();
    // wins=2 AND bestWinStreak=2 both render "2" — scope to the WINS cell
    const winsCell = screen.getByText('WINS').closest('.setup-session__cell') as HTMLElement;
    expect(within(winsCell).getByText('2')).toBeDefined();
  });

  it('displays the correct loss count', () => {
    const stats = makeStats([win(), loss(), loss()]);
    renderSetup(stats);
    expect(screen.getByText('LOSSES')).toBeDefined();
    const lossesCell = screen.getByText('LOSSES').closest('.setup-session__cell') as HTMLElement;
    expect(within(lossesCell).getByText('2')).toBeDefined();
  });

  it('displays 0 wins when only losses have been recorded', () => {
    renderSetup(makeStats([loss(), loss()]));
    // wins=0, winStreak=0, bestWinStreak=0 all render "0" — scope to WINS cell
    const winsCell = screen.getByText('WINS').closest('.setup-session__cell') as HTMLElement;
    expect(within(winsCell).getByText('0')).toBeDefined();
  });

  it('displays 0 losses when only wins have been recorded', () => {
    renderSetup(makeStats([win(), win()]));
    expect(screen.getByText('LOSSES')).toBeDefined();
    // wins=2 and winStreak=2 are "2"; losses=0 and bestWinStreak=2 — scope to LOSSES cell
    const lossesCell = screen.getByText('LOSSES').closest('.setup-session__cell') as HTMLElement;
    expect(within(lossesCell).getByText('0')).toBeDefined();
  });
});

// ─── Win rate ─────────────────────────────────────────────────────────────────

describe('SetupScreen — win rate display', () => {
  it('displays WIN RATE label', () => {
    renderSetup(makeStats([win()]));
    expect(screen.getByText('WIN RATE')).toBeDefined();
  });

  it('displays 100% win rate after all wins', () => {
    renderSetup(makeStats([win(), win(), win()]));
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('displays 0% win rate after all losses', () => {
    renderSetup(makeStats([loss(), loss()]));
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('displays 50% win rate for equal wins and losses', () => {
    renderSetup(makeStats([win(), loss()]));
    expect(screen.getByText('50%')).toBeDefined();
  });
});

// ─── Best score ───────────────────────────────────────────────────────────────

describe('SetupScreen — best score display', () => {
  it('displays BEST label', () => {
    renderSetup(makeStats([win()]));
    expect(screen.getByText('BEST')).toBeDefined();
  });

  it('displays — when no victories have been recorded', () => {
    renderSetup(makeStats([loss()]));
    // The best score cell should show the em-dash placeholder
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('displays the best score percentage after a win', () => {
    // 17 shots = 100% score; winRate also = 100% — scope to BEST cell
    renderSetup(makeStats([win(17)]));
    const bestCell = screen.getByText('BEST').closest('.setup-session__cell') as HTMLElement;
    expect(within(bestCell).getByText('100%')).toBeDefined();
  });

  it('retains the highest score across multiple games', () => {
    // First win at 17 shots (100%), second at 30 shots (lower); winRate also = 100% — scope to BEST cell
    renderSetup(makeStats([win(17), win(30)]));
    const bestCell = screen.getByText('BEST').closest('.setup-session__cell') as HTMLElement;
    expect(within(bestCell).getByText('100%')).toBeDefined();
  });
});

// ─── Average shots ────────────────────────────────────────────────────────────

describe('SetupScreen — average shots display', () => {
  it('displays AVG SHOTS label', () => {
    renderSetup(makeStats([win()]));
    expect(screen.getByText('AVG SHOTS')).toBeDefined();
  });

  it('displays the correct average over one game', () => {
    renderSetup(makeStats([win(30)]));
    expect(screen.getByText('30')).toBeDefined();
  });

  it('displays the rounded average over two games', () => {
    renderSetup(makeStats([win(20), loss(40)]));
    // (20+40)/2 = 30
    expect(screen.getByText('30')).toBeDefined();
  });
});

// ─── Win streak ───────────────────────────────────────────────────────────────

describe('SetupScreen — win streak display', () => {
  it('displays STREAK label', () => {
    renderSetup(makeStats([win()]));
    expect(screen.getByText('STREAK')).toBeDefined();
  });

  it('displays streak of 1 after one win', () => {
    renderSetup(makeStats([win()]));
    // wins=1 AND winStreak=1 both render "1" — scope to STREAK cell
    const streakCell = screen.getByText('STREAK').closest('.setup-session__cell') as HTMLElement;
    expect(within(streakCell).getByText('1')).toBeDefined();
  });

  it('displays streak of 0 after a loss breaks the streak', () => {
    renderSetup(makeStats([win(), win(), loss()]));
    expect(screen.getByText('0')).toBeDefined();
  });

  it('displays streak of 3 after three consecutive wins', () => {
    renderSetup(makeStats([win(), win(), win()]));
    // wins=3 AND winStreak=3 both render "3" — scope query to the STREAK cell
    const streakCell = screen.getByText('STREAK').closest('.setup-session__cell') as HTMLElement;
    expect(within(streakCell).getByText('3')).toBeDefined();
  });
});

// ─── Live prop updates ────────────────────────────────────────────────────────

describe('SetupScreen — panel updates when sessionStats prop changes', () => {
  it('panel appears on re-render after first result is recorded', () => {
    const { rerender } = renderSetup(initialSessionStats());
    expect(screen.queryByText('SESSION')).toBeNull();

    rerender(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={emptySetupState}
        allShipsPlaced={false}
        sessionStats={makeStats([win()])}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    expect(screen.getByText('SESSION')).toBeDefined();
  });

  it('win count updates correctly when new result is passed via props', () => {
    const { rerender } = renderSetup(makeStats([win()]));

    rerender(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={emptySetupState}
        allShipsPlaced={false}
        sessionStats={makeStats([win(), win()])}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    // wins=2, winStreak=2, bestWinStreak=2 all render "2" — scope to the WINS cell
    const winsCell = screen.getByText('WINS').closest('.setup-session__cell') as HTMLElement;
    expect(within(winsCell).getByText('2')).toBeDefined();
  });
});
// ─── Ship selector click → onSelectShip (SetupScreen.tsx line 87) ─────────────
// Line 87: `onClick={() => onSelectShip(def.name)}` on each ship selector item.
// Existing tests assert CSS classes but never click the items.

describe('SetupScreen — ship selector click triggers onSelectShip', () => {
  it('calls onSelectShip with the ship name when a ship item is clicked', () => {
    const onSelectShip = jest.fn();
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: [], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={false}
        sessionStats={initialSessionStats()}
        onSelectShip={onSelectShip}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    screen.getByText('Destroyer').click();
    expect(onSelectShip).toHaveBeenCalledWith('Destroyer');
  });

  it('calls onSelectShip with the correct name for each ship clicked', () => {
    const onSelectShip = jest.fn();
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: [], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={false}
        sessionStats={initialSessionStats()}
        onSelectShip={onSelectShip}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    screen.getByText('Carrier').click();
    expect(onSelectShip).toHaveBeenCalledWith('Carrier');

    screen.getByText('Battleship').click();
    expect(onSelectShip).toHaveBeenCalledWith('Battleship');
  });
});

// ─── LAUNCH BATTLE button class ───────────────────────────────────────────────
// When allShipsPlaced is false the button carries no ready modifier.
// When allShipsPlaced is true the button gains btn--ready (green pulsing style).

describe('SetupScreen — LAUNCH BATTLE button class', () => {
  function launchBtn(allShipsPlaced: boolean): HTMLButtonElement {
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: [], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={allShipsPlaced}
        sessionStats={initialSessionStats()}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    return screen.getByText('► LAUNCH BATTLE') as HTMLButtonElement;
  }

  it('does not have btn--ready class when ships are not yet placed', () => {
    const btn = launchBtn(false);
    expect(btn.className).not.toContain('btn--ready');
  });

  it('has btn--ready class when all ships are placed', () => {
    const btn = launchBtn(true);
    expect(btn.className).toContain('btn--ready');
  });

  it('does not have btn--primary class when all ships are placed', () => {
    const btn = launchBtn(true);
    expect(btn.className).not.toContain('btn--primary');
  });
});

// ─── Orientation toggle + control buttons (SetupScreen.tsx lines 109–115) ─────
// Lines 109–115: HORIZONTAL/VERTICAL call onSetOrientation; RANDOMIZE, CLEAR
// BOARD, and LAUNCH BATTLE call their respective handlers.

describe('SetupScreen — orientation toggle and control buttons', () => {
  function renderControls(allShipsPlaced = false) {
    const handlers = {
      onSelectShip:     jest.fn(),
      onSetOrientation: jest.fn(),
      onCellClick:      jest.fn(),
      onRandomize:      jest.fn(),
      onClearBoard:     jest.fn(),
      onBeginGame:      jest.fn(),
    };
    render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: [], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={allShipsPlaced}
        sessionStats={initialSessionStats()}
        {...handlers}
      />
    );
    return handlers;
  }

  it('calls onSetOrientation("vertical") when VERTICAL is clicked', () => {
    const { onSetOrientation } = renderControls();
    screen.getByText('VERTICAL').click();
    expect(onSetOrientation).toHaveBeenCalledWith('vertical');
  });

  it('calls onSetOrientation("horizontal") when HORIZONTAL is clicked', () => {
    const { onSetOrientation } = renderControls();
    screen.getByText('HORIZONTAL').click();
    expect(onSetOrientation).toHaveBeenCalledWith('horizontal');
  });

  it('calls onRandomize when ⟳ RANDOMIZE is clicked', () => {
    const { onRandomize } = renderControls();
    screen.getByText('⟳ RANDOMIZE').click();
    expect(onRandomize).toHaveBeenCalledTimes(1);
  });

  it('calls onClearBoard when ✕ CLEAR BOARD is clicked', () => {
    const { onClearBoard } = renderControls();
    screen.getByText('✕ CLEAR BOARD').click();
    expect(onClearBoard).toHaveBeenCalledTimes(1);
  });

  it('calls onBeginGame when ► LAUNCH BATTLE is clicked and all ships are placed', () => {
    const { onBeginGame } = renderControls(true);
    screen.getByText('► LAUNCH BATTLE').click();
    expect(onBeginGame).toHaveBeenCalledTimes(1);
  });

  it('► LAUNCH BATTLE is disabled and does not fire when ships are not yet placed', () => {
    const { onBeginGame } = renderControls(false);
    const btn = screen.getByText('► LAUNCH BATTLE') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    btn.click();
    expect(onBeginGame).not.toHaveBeenCalled();
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('SetupScreen — accessibility', () => {
  function renderDefault(orientation: 'horizontal' | 'vertical' = 'horizontal') {
    return render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: [], selectedShipName: null, orientation }}
        allShipsPlaced={false}
        sessionStats={initialSessionStats()}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
  }

  it('orientation toggle has role="group" and aria-label="Ship orientation"', () => {
    const { container } = renderDefault();
    const group = container.querySelector('[role="group"][aria-label="Ship orientation"]');
    expect(group).not.toBeNull();
  });

  it('HORIZONTAL button has aria-pressed="true" when horizontal is active', () => {
    renderDefault('horizontal');
    const btn = screen.getByRole('button', { name: 'HORIZONTAL' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('VERTICAL button has aria-pressed="false" when horizontal is active', () => {
    renderDefault('horizontal');
    const btn = screen.getByRole('button', { name: 'VERTICAL' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('VERTICAL button has aria-pressed="true" when vertical is active', () => {
    renderDefault('vertical');
    const btn = screen.getByRole('button', { name: 'VERTICAL' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('ship selector items have role="button"', () => {
    const { container } = renderDefault();
    const shipItems = container.querySelectorAll('.ship-selector__item');
    shipItems.forEach(item => {
      expect(item.getAttribute('role')).toBe('button');
    });
  });

  it('ship selector items have tabIndex=0', () => {
    const { container } = renderDefault();
    const shipItems = container.querySelectorAll('.ship-selector__item');
    shipItems.forEach(item => {
      expect(item.getAttribute('tabindex')).toBe('0');
    });
  });

  it('ship selector items have aria-label including name and size', () => {
    const { container } = renderDefault();
    const carrierItem = container.querySelector('.ship-selector__item[aria-label*="Carrier"]');
    expect(carrierItem).not.toBeNull();
    expect(carrierItem?.getAttribute('aria-label')).toContain('5 cells');
  });

  it('placed ship item aria-label includes ", placed"', () => {
    const { container } = render(
      <SetupScreen
        playerBoard={createBoard()}
        setupState={{ placedShipNames: ['Destroyer'], selectedShipName: null, orientation: 'horizontal' }}
        allShipsPlaced={false}
        sessionStats={initialSessionStats()}
        onSelectShip={() => {}}
        onSetOrientation={() => {}}
        onCellClick={() => {}}
        onRandomize={() => {}}
        onClearBoard={() => {}}
        onBeginGame={() => {}}
      />
    );
    const destroyerItem = container.querySelector('.ship-selector__item[aria-label*="Destroyer"]');
    expect(destroyerItem?.getAttribute('aria-label')).toContain(', placed');
  });
});