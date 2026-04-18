/**
 * MobileSetupScreen component tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createBoard } from '../models/Board';
import type { SetupState } from '../hooks/useGameState';
import { initialSessionStats } from '../hooks/useSessionStats';

jest.mock('../components/BoardGrid', () => () => <div data-testid="board-grid">BOARD_GRID</div>);

const baseSetupState: SetupState = {
  placedShipNames:  [],
  selectedShipName: null,
  orientation:      'horizontal',
};

function renderScreen(overrides: Partial<{
  setupState:       SetupState;
  allShipsPlaced:   boolean;
  onSelectShip:     jest.Mock;
  onSetOrientation: jest.Mock;
  onRandomize:      jest.Mock;
  onClearBoard:     jest.Mock;
  onBeginGame:      jest.Mock;
}> = {}) {
  const MobileSetupScreen = require('../components/MobileSetupScreen').default;
  const props = {
    playerBoard:      createBoard(),
    setupState:       baseSetupState,
    allShipsPlaced:   false,
    sessionStats:     initialSessionStats(),
    onSelectShip:     jest.fn(),
    onSetOrientation: jest.fn(),
    onCellClick:      jest.fn(),
    onRandomize:      jest.fn(),
    onClearBoard:     jest.fn(),
    onBeginGame:      jest.fn(),
    ...overrides,
  };
  return render(<MobileSetupScreen {...props} />);
}

describe('MobileSetupScreen — layout', () => {
  it('renders the board at the top', () => {
    renderScreen();
    expect(screen.getByTestId('board-grid')).toBeDefined();
  });

  it('ship selector is a horizontal scrollable container', () => {
    const { container } = renderScreen();
    const shipsContainer = container.querySelector('.mobile-setup-screen__ships');
    expect(shipsContainer).not.toBeNull();
  });

  it('all 5 ships appear in the selector', () => {
    renderScreen();
    expect(screen.getByText('Carrier')).toBeDefined();
    expect(screen.getByText('Battleship')).toBeDefined();
    expect(screen.getByText('Cruiser')).toBeDefined();
    expect(screen.getByText('Submarine')).toBeDefined();
    expect(screen.getByText('Destroyer')).toBeDefined();
  });

  it('session stats panel is NOT rendered', () => {
    const { container } = renderScreen();
    expect(container.querySelector('.setup-session')).toBeNull();
  });
});

describe('MobileSetupScreen — ship selector', () => {
  it('clicking a ship item calls onSelectShip with the ship name', () => {
    const onSelectShip = jest.fn();
    renderScreen({ onSelectShip });
    fireEvent.click(screen.getByText('Carrier'));
    expect(onSelectShip).toHaveBeenCalledWith('Carrier');
  });

  it('clicking Battleship calls onSelectShip with Battleship', () => {
    const onSelectShip = jest.fn();
    renderScreen({ onSelectShip });
    fireEvent.click(screen.getByText('Battleship'));
    expect(onSelectShip).toHaveBeenCalledWith('Battleship');
  });
});

describe('MobileSetupScreen — orientation toggle', () => {
  it('HORIZONTAL button calls onSetOrientation with "horizontal"', () => {
    const onSetOrientation = jest.fn();
    renderScreen({ onSetOrientation });
    fireEvent.click(screen.getByText('HORIZONTAL'));
    expect(onSetOrientation).toHaveBeenCalledWith('horizontal');
  });

  it('VERTICAL button calls onSetOrientation with "vertical"', () => {
    const onSetOrientation = jest.fn();
    renderScreen({ onSetOrientation });
    fireEvent.click(screen.getByText('VERTICAL'));
    expect(onSetOrientation).toHaveBeenCalledWith('vertical');
  });
});

describe('MobileSetupScreen — action buttons', () => {
  it('RANDOMIZE button calls onRandomize', () => {
    const onRandomize = jest.fn();
    renderScreen({ onRandomize });
    fireEvent.click(screen.getByText('⟳ RANDOMIZE'));
    expect(onRandomize).toHaveBeenCalledTimes(1);
  });

  it('CLEAR BOARD button calls onClearBoard', () => {
    const onClearBoard = jest.fn();
    renderScreen({ onClearBoard });
    fireEvent.click(screen.getByText('✕ CLEAR BOARD'));
    expect(onClearBoard).toHaveBeenCalledTimes(1);
  });

  it('LAUNCH BATTLE is disabled when allShipsPlaced=false', () => {
    renderScreen({ allShipsPlaced: false });
    const btn = screen.getByText('► LAUNCH BATTLE') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('LAUNCH BATTLE is enabled and calls onBeginGame when allShipsPlaced=true', () => {
    const onBeginGame = jest.fn();
    renderScreen({ allShipsPlaced: true, onBeginGame });
    const btn = screen.getByText('► LAUNCH BATTLE') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onBeginGame).toHaveBeenCalledTimes(1);
  });
});
