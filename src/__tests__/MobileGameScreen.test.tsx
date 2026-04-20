/**
 * MobileGameScreen component tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createGame } from '../models/Game';
import type { GameState } from '../models/types';
import type { LogEntry } from '../hooks/useGameState';

// Mock child components
jest.mock('../components/BoardGrid', () => (props: Record<string, any>) => (
  <div
    data-testid={props.isOwn ? 'own-board' : 'enemy-board'}
    data-hide-labels={props.hideLabels ? 'true' : 'false'}
    data-on-cell-click={props.onCellClick ? 'true' : 'false'}
    onClick={() => props.onCellClick?.(0, 0)}
  >
    {props.isOwn ? 'OWN_BOARD' : 'ENEMY_BOARD'}
  </div>
));

jest.mock('../components/FleetRoster', () => (props: Record<string, any>) => (
  <div
    data-testid={props.compact ? 'fleet-roster-compact' : 'fleet-roster'}
    data-compact={props.compact ? 'true' : 'false'}
    data-label={props.label}
  >
    {props.label}
  </div>
));

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return { ...createGame(), ...overrides };
}

function makeLog(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id:      i,
    type:    'hit' as const,
    message: `Hit at ${i}`,
    turn:    'player' as const,
  }));
}

function renderScreen(overrides: Partial<{
  gameState:  GameState;
  log:        LogEntry[];
  aiThinking: boolean;
  onFireAt:   jest.Mock;
}> = {}) {
  const MobileGameScreen = require('../components/MobileGameScreen').default;
  const props = {
    gameState:  makeGameState({ phase: 'playing', currentTurn: 'player' }),
    log:        [],
    aiThinking: false,
    onFireAt:   jest.fn(),
    ...overrides,
  };
  return render(<MobileGameScreen {...props} />);
}

describe('MobileGameScreen — portrait layout', () => {
  it('renders own board at full size (no board-grid--mini wrapper)', () => {
    renderScreen();
    expect(document.querySelector('.board-grid--mini')).toBeNull();
    expect(screen.getByTestId('own-board')).toBeDefined();
  });

  it('own board has hideLabels=false (labels visible)', () => {
    renderScreen();
    const ownBoard = screen.getByTestId('own-board');
    expect(ownBoard.getAttribute('data-hide-labels')).toBe('false');
  });

  it('renders YOUR WATERS and ENEMY WATERS headers', () => {
    renderScreen();
    expect(screen.getByText('YOUR WATERS')).toBeDefined();
    expect(screen.getByText('ENEMY WATERS')).toBeDefined();
  });

  it('own board has no onCellClick (non-interactive)', () => {
    renderScreen();
    const ownBoard = screen.getByTestId('own-board');
    expect(ownBoard.getAttribute('data-on-cell-click')).toBe('false');
  });

  it('enemy board receives onFireAt when it is player turn', () => {
    renderScreen({
      gameState: makeGameState({ phase: 'playing', currentTurn: 'player' }),
    });
    const enemyBoard = screen.getByTestId('enemy-board');
    expect(enemyBoard.getAttribute('data-on-cell-click')).toBe('true');
  });

  it('enemy board has no onCellClick when it is not player turn', () => {
    renderScreen({
      gameState: makeGameState({ phase: 'playing', currentTurn: 'opponent' }),
    });
    const enemyBoard = screen.getByTestId('enemy-board');
    expect(enemyBoard.getAttribute('data-on-cell-click')).toBe('false');
  });

  it('FleetRoster receives compact=true', () => {
    renderScreen();
    const compactRosters = screen.getAllByTestId('fleet-roster-compact');
    expect(compactRosters.length).toBeGreaterThan(0);
  });

  it('onFireAt is called when enemy board cell is clicked during player turn', () => {
    const onFireAt = jest.fn();
    renderScreen({ onFireAt });
    fireEvent.click(screen.getByTestId('enemy-board'));
    expect(onFireAt).toHaveBeenCalledWith(0, 0);
  });

  it('shows AI thinking indicator when aiThinking=true', () => {
    renderScreen({ aiThinking: true });
    expect(screen.getByText('INCOMING…')).toBeDefined();
  });

  it('does not show AI thinking indicator when aiThinking=false and it is player turn', () => {
    renderScreen({ aiThinking: false });
    expect(screen.queryByText('INCOMING…')).toBeNull();
  });
});

describe('MobileGameScreen — combat log', () => {
  it('shows exactly 5 entries when log has more than 5', () => {
    renderScreen({ log: makeLog(8) });
    const entries = document.querySelectorAll('.combat-log__entry');
    expect(entries).toHaveLength(5);
  });

  it('shows toggle button with correct count when log has more than 5', () => {
    renderScreen({ log: makeLog(8) });
    expect(screen.getByText('▼ +3 MORE')).toBeDefined();
  });

  it('clicking toggle shows all entries', () => {
    renderScreen({ log: makeLog(8) });
    fireEvent.click(screen.getByText('▼ +3 MORE'));
    const entries = document.querySelectorAll('.combat-log__entry');
    expect(entries).toHaveLength(8);
  });

  it('clicking toggle again collapses back to 5', () => {
    renderScreen({ log: makeLog(8) });
    fireEvent.click(screen.getByText('▼ +3 MORE'));
    fireEvent.click(screen.getByText('▲ HIDE'));
    const entries = document.querySelectorAll('.combat-log__entry');
    expect(entries).toHaveLength(5);
  });

  it('toggle button does not appear when log has 5 or fewer entries', () => {
    renderScreen({ log: makeLog(5) });
    expect(screen.queryByText(/MORE/)).toBeNull();
    expect(screen.queryByText(/HIDE/)).toBeNull();
  });

  it('shows all entries when log has fewer than 5', () => {
    renderScreen({ log: makeLog(3) });
    const entries = document.querySelectorAll('.combat-log__entry');
    expect(entries).toHaveLength(3);
  });
});
