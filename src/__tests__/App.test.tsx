/**
 * App component tests
 *
 * Covers phase routing (setup → playing → gameover), difficulty selection
 * overlay, battle-starting transition, header status pills, session result
 * recording, and the StrictMode double-invocation guard on recordResult.
 *
 * Strategy: mock useGameState and useSessionStats so the test controls every
 * piece of state directly — no real hooks, no timers, no AI calls.
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

// Mock CSS import so Jest doesn't choke on it
jest.mock('../styles/global.css', () => ({}), { virtual: true });

// Mock child components to their key rendered text so tests stay fast and
// isolated from those components' own logic.
jest.mock('../components/SetupScreen',      () => () => <div>SETUP_SCREEN</div>);
jest.mock('../components/GameScreen',       () => () => <div>GAME_SCREEN</div>);
jest.mock('../components/DifficultySelect', () => ({ onSelect }: { onSelect: (d: string) => void }) => (
  <button onClick={() => onSelect('medium')}>DIFFICULTY_SELECT</button>
));
// Control useGameState entirely from tests
const mockUseGameState = jest.fn();
// GameOver mock stores latest props so tests can invoke onViewBoard/onRestart
// without needing jest.doMock or mockImplementation.
let lastGameOverProps: Record<string, any> = {};
jest.mock('../components/GameOver', () => (props: Record<string, any>) => {
  lastGameOverProps = props;
  return <div>GAME_OVER</div>;
});

jest.mock('../hooks/useGameState', () => ({
  useGameState: () => mockUseGameState(),
}));

// Control useSessionStats — expose recordResult as a jest.fn() so we can spy on it
const mockRecordResult = jest.fn();
jest.mock('../hooks/useSessionStats', () => {
  const actual = jest.requireActual('../hooks/useSessionStats');
  return {
    useSessionStats: () => ({ stats: actual.initialSessionStats(), recordResult: mockRecordResult }),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────


const baseSetupState: SetupState = {
  placedShipNames:  [],
  selectedShipName: null,
  orientation:      'horizontal',
};

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  // Use createGame() so the object always has turnCount and every other field
  // that App.tsx destructures — avoids any mismatch with partial construction.
  return { ...createGame(), ...overrides };
}

function defaultHookState(overrides: Partial<ReturnType<typeof mockUseGameState>> = {}) {
  return {
    gameState:         makeGameState(),
    setupState:        baseSetupState,
    log:               [] as LogEntry[],
    aiThinking:        false,
    battleStarting:    false,
    allShipsPlaced:    false,
    difficulty:        'medium' as const,
    selectShip:        jest.fn(),
    setOrientation:    jest.fn(),
    placeSelectedShip: jest.fn(),
    randomizePlacement:jest.fn(),
    beginGame:         jest.fn(),
    selectDifficulty:  jest.fn(),
    fireAt:            jest.fn(),
    resetGame:         jest.fn(),
    ...overrides,
  };
}

// Import App AFTER mocks are set up
import App from '../App';

beforeEach(() => {
  jest.clearAllMocks();
  lastGameOverProps = {};
  mockUseGameState.mockReturnValue(defaultHookState());
});

// ─── Phase routing ────────────────────────────────────────────────────────────

describe('App — phase routing', () => {
  it('renders SetupScreen when phase is setup', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'setup' }),
    }));
    render(<App />);
    expect(screen.getByText('SETUP_SCREEN')).toBeDefined();
    expect(screen.queryByText('GAME_SCREEN')).toBeNull();
    expect(screen.queryByText('GAME_OVER')).toBeNull();
  });

  it('renders GameScreen when phase is playing', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing' }),
    }));
    render(<App />);
    expect(screen.getByText('GAME_SCREEN')).toBeDefined();
    expect(screen.queryByText('SETUP_SCREEN')).toBeNull();
  });

  it('renders GameScreen during gameover phase (board remains visible)', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    render(<App />);
    expect(screen.getByText('GAME_SCREEN')).toBeDefined();
  });

  it('renders GameOver overlay when phase is gameover and winner is set', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    render(<App />);
    expect(screen.getByText('GAME_OVER')).toBeDefined();
  });

  it('does not render GameOver when phase is gameover but winner is null', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: null }),
    }));
    render(<App />);
    expect(screen.queryByText('GAME_OVER')).toBeNull();
  });
});

// ─── Difficulty selection overlay ─────────────────────────────────────────────

describe('App — difficulty selection overlay', () => {
  it('renders DifficultySelect when difficulty is null', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ difficulty: null }));
    render(<App />);
    expect(screen.getByText('DIFFICULTY_SELECT')).toBeDefined();
  });

  it('does not render DifficultySelect when difficulty is already chosen', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ difficulty: 'medium' }));
    render(<App />);
    expect(screen.queryByText('DIFFICULTY_SELECT')).toBeNull();
  });
});

// ─── Battle-starting transition ───────────────────────────────────────────────

describe('App — battle-starting overlay', () => {
  it('renders the BATTLE COMMENCING overlay when battleStarting is true', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ battleStarting: true }));
    render(<App />);
    expect(screen.getByText('BATTLE COMMENCING')).toBeDefined();
    expect(screen.getByText('PREPARE FOR ENGAGEMENT')).toBeDefined();
  });

  it('does not render the BATTLE COMMENCING overlay when battleStarting is false', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ battleStarting: false }));
    render(<App />);
    expect(screen.queryByText('BATTLE COMMENCING')).toBeNull();
  });
});

// ─── Header status pills ──────────────────────────────────────────────────────

describe('App — header status', () => {
  it('shows BATTLESHIP logo', () => {
    render(<App />);
    expect(screen.getByText('SHIP')).toBeDefined(); // split across logo span
  });

  it('shows FLEET DEPLOYMENT pill during setup phase', () => {
    render(<App />);
    expect(screen.getByText('FLEET DEPLOYMENT')).toBeDefined();
  });

  it('shows YOUR TURN and ENEMY TURN pills during playing phase', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing' }),
    }));
    render(<App />);
    expect(screen.getByText('YOUR TURN')).toBeDefined();
    expect(screen.getByText('ENEMY TURN')).toBeDefined();
  });

  it('shows MISSILES FIRED counter during playing phase', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing', shotCount: 7 }),
    }));
    render(<App />);
    expect(screen.getByText('MISSILES FIRED: 7')).toBeDefined();
  });

  it('shows THREAT pill with difficulty label during playing phase', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'playing' }),
      difficulty: 'hard',
    }));
    render(<App />);
    expect(screen.getByText('THREAT: HARD')).toBeDefined();
  });

  it('shows AI TARGETING indicator when aiThinking is true', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'playing' }),
      aiThinking: true,
    }));
    render(<App />);
    expect(screen.getByText('AI TARGETING...')).toBeDefined();
  });

  it('hides AI TARGETING indicator when aiThinking is false', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'playing' }),
      aiThinking: false,
    }));
    render(<App />);
    expect(screen.queryByText('AI TARGETING...')).toBeNull();
  });

  it('shows THREAT pill in setup phase when difficulty is set', () => {
    mockUseGameState.mockReturnValue(defaultHookState({ difficulty: 'sweaty' }));
    render(<App />);
    expect(screen.getByText('THREAT: SWEATY')).toBeDefined();
  });
});

// ─── Session result recording (lines 37–47) ───────────────────────────────────

describe('App — session result recording', () => {
  it('calls recordResult once when phase transitions to gameover', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'medium',
    }));
    render(<App />);
    expect(mockRecordResult).toHaveBeenCalledTimes(1);
    // Check the stable fields. The numeric shot/turn-count field is tested in the
    // useSessionStats suite; its name may differ across App versions.
    expect(mockRecordResult).toHaveBeenCalledWith(
      expect.objectContaining({ winner: 'player', difficulty: 'medium' })
    );
  });

  it('does not call recordResult when phase is setup', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'setup' }),
    }));
    render(<App />);
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not call recordResult when phase is playing', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'playing' }),
    }));
    render(<App />);
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not call recordResult when winner is null even if phase is gameover', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: null }),
    }));
    render(<App />);
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not call recordResult when difficulty is null', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'opponent', shotCount: 40 }),
      difficulty: null,
    }));
    render(<App />);
    expect(mockRecordResult).not.toHaveBeenCalled();
  });

  it('does not double-record when the game-over state rerenders with the same values', () => {
    // The recordedRef guard prevents re-recording on re-renders with the same key.
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'easy',
    }));
    const { rerender } = render(<App />);
    expect(mockRecordResult).toHaveBeenCalledTimes(1);

    rerender(<App />);
    expect(mockRecordResult).toHaveBeenCalledTimes(1); // still only once
  });

  it('resets the recorded key when phase returns to setup', () => {
    // First render: gameover -> records once.
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'medium',
    }));
    const { rerender } = render(<App />);
    expect(mockRecordResult).toHaveBeenCalledTimes(1);

    // Transition to setup: recordedRef is cleared.
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'setup' }),
    }));
    act(() => { rerender(<App />); });

    // Back to gameover with the same values - should record again because ref was reset.
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState:  makeGameState({ phase: 'gameover', winner: 'player', shotCount: 20 }),
      difficulty: 'medium',
    }));
    act(() => { rerender(<App />); });
    expect(mockRecordResult).toHaveBeenCalledTimes(2);
  });
});

// ─── Board reveal + floating NEW BATTLE (App lines 144–152) ───────────────────

describe('App — board reveal and floating NEW BATTLE', () => {
  it('renders GameOver overlay when gameover and board is not yet revealed', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    render(<App />);
    expect(screen.getByText('GAME_OVER')).toBeDefined();
    expect(screen.queryByText('⟳ NEW BATTLE')).toBeNull();
  });

  it('hides GameOver and shows floating NEW BATTLE when onViewBoard is clicked (line 145)', () => {
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
    }));
    const { rerender } = render(<App />);
    expect(screen.getByText('GAME_OVER')).toBeDefined();

    // Trigger the onViewBoard callback that App passed to GameOver
    act(() => { lastGameOverProps.onViewBoard?.(); });
    rerender(<App />);

    // GameOver is hidden (boardRevealed=true so !boardRevealed condition fails)
    expect(screen.queryByText('GAME_OVER')).toBeNull();
    // Floating NEW BATTLE button appears (lines 150–155)
    expect(screen.getByText('⟳ NEW BATTLE')).toBeDefined();
  });

  it('floating NEW BATTLE button calls resetGame and hides itself (line 152)', () => {
    const mockResetGame = jest.fn();
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
      resetGame: mockResetGame,
    }));
    const { rerender } = render(<App />);

    // Reveal the board first
    act(() => { lastGameOverProps.onViewBoard?.(); });
    rerender(<App />);

    // Floating button is now visible — click it (line 152)
    const btn = screen.getByText('⟳ NEW BATTLE');
    expect(btn).toBeDefined();
    act(() => { fireEvent.click(btn); });
    rerender(<App />);

    expect(mockResetGame).toHaveBeenCalled();
    // After reset, boardRevealed is false so floating button disappears
    expect(screen.queryByText('⟳ NEW BATTLE')).toBeNull();
  });

  it('GameOver onRestart also resets boardRevealed and calls resetGame (line 144)', () => {
    const mockResetGame = jest.fn();
    mockUseGameState.mockReturnValue(defaultHookState({
      gameState: makeGameState({ phase: 'gameover', winner: 'player' }),
      resetGame: mockResetGame,
    }));
    const { rerender } = render(<App />);

    // Call onRestart directly from the captured props (line 144)
    act(() => { lastGameOverProps.onRestart?.(); });
    rerender(<App />);

    expect(mockResetGame).toHaveBeenCalled();
    // boardRevealed is reset to false — no floating button
    expect(screen.queryByText('⟳ NEW BATTLE')).toBeNull();
  });
});