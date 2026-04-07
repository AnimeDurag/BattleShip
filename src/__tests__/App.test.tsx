/**
 * App component tests
 *
 * Covers screen routing (menu → game), phase routing within the game tree
 * (setup → playing → gameover), battle-starting transition, header status pills,
 * session result recording, StrictMode double-invocation guard, and board reveal.
 *
 * Strategy: mock useGameState, useSessionStats, and all child components so the
 * test controls every piece of state directly — no real hooks, no timers, no AI.
 *
 * Navigation into the game tree is done by firing a click on one of the
 * difficulty buttons rendered by the MainMenu mock. This is more reliable than
 * calling lastMenuProps.onSoloStart because the click handler captures
 * props.onSoloStart in its own closure at render time, independent of any
 * module-level variable that could be stale or un-populated.
 *
 * Required jest config:   testEnvironment: 'jsdom'
 * Required packages:      @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createGame } from '../models/Game';
import type { GameState } from '../models/types';
import type { SetupState, LogEntry } from '../hooks/useGameState';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../styles/global.css', () => ({}), { virtual: true });

jest.mock('../components/SetupScreen', () => () => <div>SETUP_SCREEN</div>);
jest.mock('../components/GameScreen',  () => () => <div>GAME_SCREEN</div>);

// MainMenu mock — renders MAIN_MENU text plus one button per difficulty so
// tests can navigate into the game tree via fireEvent.click. Each button's
// onClick captures props.onSoloStart in its own closure at render time,
// so navigation works regardless of the state of lastMenuProps.
// lastMenuProps is still captured for prop-value assertions (e.g. sessionStats).
let lastMenuProps: Record<string, any> = {};
jest.mock('../components/Mainmenu', () => (props: Record<string, any>) => {
  lastMenuProps = props;
  return (
    <>
      <div>MAIN_MENU</div>
      <button onClick={() => props.onSoloStart('easy')}>SOLO_EASY</button>
      <button onClick={() => props.onSoloStart('medium')}>SOLO_MEDIUM</button>
      <button onClick={() => props.onSoloStart('hard')}>SOLO_HARD</button>
      <button onClick={() => props.onSoloStart('sweaty')}>SOLO_SWEATY</button>
    </>
  );
});

// GameOver mock — captures latest props so tests can invoke onRestart/onViewBoard.
let lastGameOverProps: Record<string, any> = {};
jest.mock('../components/GameOver', () => (props: Record<string, any>) => {
  lastGameOverProps = props;
  return <div>GAME_OVER</div>;
});

// useGameState mock — fully controlled per test.
const mockUseGameState = jest.fn();
jest.mock('../hooks/useGameState', () => ({
  useGameState: () => mockUseGameState(),
}));

// useSessionStats mock — expose recordResult as a jest.fn() to spy on.
// Spread the real module so named exports (winRate, avgShots, initialSessionStats)
// remain available to MainMenu, which imports them directly alongside the hook.
const mockRecordResult = jest.fn();
jest.mock('../hooks/useSessionStats', () => {
  const actual = jest.requireActual('../hooks/useSessionStats');
  return {
    ...actual,
    useSessionStats: () => ({
      stats: actual.initialSessionStats(),
      recordResult: mockRecordResult,
    }),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseSetupState: SetupState = {
  placedShipNames:  [],
  selectedShipName: null,
  orientation:      'horizontal',
};

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return { ...createGame(), ...overrides };
}

function defaultHookState(overrides: Partial<ReturnType<typeof mockUseGameState>> = {}) {
  return {
    gameState:          makeGameState(),
    setupState:         baseSetupState,
    log:                [] as LogEntry[],
    aiThinking:         false,
    battleStarting:     false,
    allShipsPlaced:     false,
    difficulty:         'medium' as const,
    playerShotCount:    0,
    selectShip:         jest.fn(),
    setOrientation:     jest.fn(),
    placeSelectedShip:  jest.fn(),
    randomizePlacement: jest.fn(),
    clearBoard:         jest.fn(),
    beginGame:          jest.fn(),
    selectDifficulty:   jest.fn(),
    fireAt:             jest.fn(),
    resetGame:          jest.fn(),
    ...overrides,
  };
}

// Clicks the SOLO_MEDIUM button rendered by the MainMenu mock, navigating App
// from 'menu' screen to 'game' screen via the button's own closure over props.
function clickSoloMedium() {
  act(() => { fireEvent.click(screen.getByText('SOLO_MEDIUM')); });
}

// Import App AFTER mocks are set up.
import App from '../App';

beforeEach(() => {
  jest.clearAllMocks();
  lastMenuProps     = {};
  lastGameOverProps = {};
  mockUseGameState.mockReturnValue(defaultHookState());
});

// ─── Screen routing ───────────────────────────────────────────────────────────

describe('App — screen routing', () => {
  it('renders MainMenu on initial load', () => {
    render(<App />);
    expect(screen.getByText('MAIN_MENU')).toBeDefined();
    expect(screen.queryByText('SETUP_SCREEN')).toBeNull();
    expect(screen.queryByText('GAME_SCREEN')).toBeNull();
  });

  it('transitions to the game tree when a difficulty button is clicked', () => {
    const mockSelectDifficulty = jest.fn();
    mockUseGameState.mockReturnValue(defaultHookState({ selectDifficulty: mockSelectDifficulty }));
    render(<App />);

    act(() => { fireEvent.click(screen.getByText('SOLO_HARD')); });

    expect(screen.queryByText('MAIN_MENU')).toBeNull();
    expect(screen.getByText('SETUP_SCREEN')).toBeDefined();
    expect(mockSelectDifficulty).toHaveBeenCalledWith('hard');
  });

  it('calls selectDifficulty with the correct value for each difficulty button', () => {
    const difficulties = ['easy', 'medium', 'hard', 'sweaty'] as const;
    for (const diff of difficulties) {
      const mockSelectDifficulty = jest.fn();
      mockUseGameState.mockReturnValue(defaultHookState({ selectDifficulty: mockSelectDifficulty }));

      const { unmount } = render(<App />);
      act(() => { fireEvent.click(screen.getByText('SOLO_' + diff.toUpperCase())); });
      expect(mockSelectDifficulty).toHaveBeenCalledWith(diff);
      unmount();
    }
  });

  it('returns to MainMenu after handleRestart is called from GameOver', () => {
    // Start in gameover so GameOver renders immediately on entry to the game
    // tree, populating lastGameOverProps.onRestart before we call it.
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    render(<App />);
    clickSoloMedium();

    expect(screen.queryByText('MAIN_MENU')).toBeNull();
    expect(screen.getByText('GAME_OVER')).toBeDefined();

    act(() => { lastGameOverProps.onRestart?.(); });
    expect(screen.getByText('MAIN_MENU')).toBeDefined();
  });

  it('calls resetGame when returning to the menu via GameOver onRestart', () => {
    const mockResetGame = jest.fn();
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'opponent' }),
      resetGame: mockResetGame,
    }));
    render(<App />);
    clickSoloMedium();

    act(() => { lastGameOverProps.onRestart?.(); });
    expect(mockResetGame).toHaveBeenCalledTimes(1);
  });

  it('MainMenu receives the sessionStats prop', () => {
    render(<App />);
    expect(lastMenuProps.sessionStats).toBeDefined();
  });
});

// ─── Phase routing within the game tree ──────────────────────────────────────

describe('App — phase routing (game tree)', () => {
  function renderInGame() {
    const r = render(<App />);
    clickSoloMedium();
    return r;
  }

  it('renders SetupScreen when phase is setup', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'setup' }),
    }));
    renderInGame();
    expect(screen.getByText('SETUP_SCREEN')).toBeDefined();
    expect(screen.queryByText('GAME_SCREEN')).toBeNull();
  });

  it('renders GameScreen when phase is playing', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing' }),
    }));
    renderInGame();
    expect(screen.getByText('GAME_SCREEN')).toBeDefined();
    expect(screen.queryByText('SETUP_SCREEN')).toBeNull();
  });

  it('renders GameScreen during gameover (board stays visible)', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    renderInGame();
    expect(screen.getByText('GAME_SCREEN')).toBeDefined();
  });

  it('renders GameOver overlay when phase is gameover and winner is set', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    renderInGame();
    expect(screen.getByText('GAME_OVER')).toBeDefined();
  });

  it('does not render GameOver when winner is null', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: null }),
    }));
    renderInGame();
    expect(screen.queryByText('GAME_OVER')).toBeNull();
  });
});

// ─── Battle-starting transition ───────────────────────────────────────────────

describe('App — battle-starting overlay', () => {
  function renderInGame() {
    const r = render(<App />);
    clickSoloMedium();
    return r;
  }

  it('renders the BATTLE COMMENCING overlay when battleStarting is true', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ battleStarting: true }));
    renderInGame();
    expect(screen.getByText('BATTLE COMMENCING')).toBeDefined();
    expect(screen.getByText('PREPARE FOR ENGAGEMENT')).toBeDefined();
  });

  it('does not render the overlay when battleStarting is false', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ battleStarting: false }));
    renderInGame();
    expect(screen.queryByText('BATTLE COMMENCING')).toBeNull();
  });
});

// ─── Header status pills ──────────────────────────────────────────────────────

describe('App — header status', () => {
  function renderInGame() {
    const r = render(<App />);
    clickSoloMedium();
    return r;
  }

  it('shows BATTLESHIP logo in the game tree', () => {
    renderInGame();
    expect(screen.getByText('SHIP')).toBeDefined();
  });

  it('shows FLEET DEPLOYMENT pill during setup phase', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'setup' }),
    }));
    renderInGame();
    expect(screen.getByText('FLEET DEPLOYMENT')).toBeDefined();
  });

  it('shows YOUR TURN and ENEMY TURN pills during playing phase', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing' }),
    }));
    renderInGame();
    expect(screen.getByText('YOUR TURN')).toBeDefined();
    expect(screen.getByText('ENEMY TURN')).toBeDefined();
  });

  it('shows MISSILES FIRED counter during playing phase', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing', shotCount: 7 }),
    }));
    renderInGame();
    expect(screen.getByText('MISSILES FIRED: 7')).toBeDefined();
  });

  it('shows THREAT pill with difficulty label during playing phase', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'playing' }),
      difficulty: 'hard',
    }));
    renderInGame();
    expect(screen.getByText('THREAT: HARD')).toBeDefined();
  });

  it('shows AI TARGETING indicator when aiThinking is true', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'playing' }),
      aiThinking: true,
    }));
    renderInGame();
    expect(screen.getByText('AI TARGETING...')).toBeDefined();
  });

  it('hides AI TARGETING indicator when aiThinking is false', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'playing' }),
      aiThinking: false,
    }));
    renderInGame();
    expect(screen.queryByText('AI TARGETING...')).toBeNull();
  });

  it('shows THREAT pill in setup phase when difficulty is set', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ difficulty: 'sweaty' }));
    renderInGame();
    expect(screen.getByText('THREAT: SWEATY')).toBeDefined();
  });
});

// ─── Session result recording ─────────────────────────────────────────────────

describe('App — session result recording', () => {
  function renderInGame() {
    const r = render(<App />);
    clickSoloMedium();
    return r;
  }

  it('calls recordResult once when phase transitions to gameover', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'medium',
    }));
    renderInGame();
    expect(mockRecordResult).toHaveBeenCalledTimes(1);
    expect(mockRecordResult).toHaveBeenCalledWith(
      expect.objectContaining({ winner: 'player', difficulty: 'medium' })
    );
  });

  it('does not call recordResult when phase is setup', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'setup' }),
    }));
    renderInGame();
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not call recordResult when phase is playing', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing' }),
    }));
    renderInGame();
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not call recordResult when winner is null', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: null }),
    }));
    renderInGame();
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not call recordResult when difficulty is null', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'opponent', shotCount: 40 }),
      difficulty: null,
    }));
    renderInGame();
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not double-record when the game-over state rerenders with the same values', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'easy',
    }));
    const { rerender } = renderInGame();
    expect(mockRecordResult).toHaveBeenCalledTimes(1);

    rerender(<App />);
    expect(mockRecordResult).toHaveBeenCalledTimes(1);
  });

  it('resets the recorded key when phase returns to setup', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'medium',
    }));
    const { rerender } = renderInGame();
    expect(mockRecordResult).toHaveBeenCalledTimes(1);

    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'setup' }),
    }));
    act(() => { rerender(<App />); });

    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'medium',
    }));
    act(() => { rerender(<App />); });
    expect(mockRecordResult).toHaveBeenCalledTimes(2);
  });

  it('records again when shotCount changes in gameover without returning to setup (line 41)', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'medium',
    }));
    const { rerender } = renderInGame();
    expect(mockRecordResult).toHaveBeenCalledTimes(1);

    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 30 }),
      difficulty: 'medium',
    }));
    act(() => { rerender(<App />); });
    expect(mockRecordResult).toHaveBeenCalledTimes(2);
  });
});

// ─── Board reveal + floating NEW BATTLE ──────────────────────────────────────

describe('App — board reveal and floating NEW BATTLE', () => {
  function renderInGame() {
    const r = render(<App />);
    clickSoloMedium();
    return r;
  }

  it('renders GameOver overlay when gameover and board is not yet revealed', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    renderInGame();
    expect(screen.getByText('GAME_OVER')).toBeDefined();
    expect(screen.queryByText('⟳ NEW BATTLE')).toBeNull();
  });

  it('hides GameOver and shows floating NEW BATTLE when onViewBoard is clicked', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    const { rerender } = renderInGame();

    act(() => { lastGameOverProps.onViewBoard?.(); });
    rerender(<App />);

    expect(screen.queryByText('GAME_OVER')).toBeNull();
    expect(screen.getByText('⟳ NEW BATTLE')).toBeDefined();
  });

  it('floating NEW BATTLE returns to MainMenu and calls resetGame', () => {
    const mockResetGame = jest.fn();
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
      resetGame: mockResetGame,
    }));
    const { rerender } = renderInGame();

    act(() => { lastGameOverProps.onViewBoard?.(); });
    rerender(<App />);

    act(() => { fireEvent.click(screen.getByText('⟳ NEW BATTLE')); });
    rerender(<App />);

    expect(mockResetGame).toHaveBeenCalled();
    expect(screen.getByText('MAIN_MENU')).toBeDefined();
  });

  it('GameOver onRestart returns to MainMenu and calls resetGame', () => {
    const mockResetGame = jest.fn();
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
      resetGame: mockResetGame,
    }));
    const { rerender } = renderInGame();

    act(() => { lastGameOverProps.onRestart?.(); });
    rerender(<App />);

    expect(mockResetGame).toHaveBeenCalled();
    expect(screen.getByText('MAIN_MENU')).toBeDefined();
  });
});