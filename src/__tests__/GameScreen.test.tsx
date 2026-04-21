/**
 * GameScreen component tests
 *
 * Covers structural rendering (fleet rosters, combat log, board labels),
 * player-turn / AI-thinking overlays, hint text visibility, and
 * log passthrough to CombatLog.
 *
 * Required jest config:   testEnvironment: 'jsdom'
 * Required packages:      @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import GameScreen from '../components/GameScreen';
import { createBoard } from '../models/Board';
import { createGame, startGame } from '../models/Game';
import type { GameState } from '../models/types';
import type { LogEntry } from '../hooks/useGameState';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function startedGame(overrides: Partial<GameState> = {}): GameState {
  const base = startGame({ ...createGame(), opponentBoard: createBoard() });
  return { ...base, ...overrides };
}

const sampleLog: LogEntry[] = [
  { id: 1, message: 'BATTLE COMMENCED — FIRE AT WILL', type: 'system' },
  { id: 2, message: '▸ A1 — HIT',                      type: 'hit'    },
  { id: 3, message: '◂ ENEMY B3 — MISS',               type: 'enemy'  },
];

function renderGameScreen(overrides: Partial<Parameters<typeof GameScreen>[0]> = {}) {
  return render(
    <GameScreen
      gameState={startedGame()}
      log={sampleLog}
      aiThinking={false}
      onFireAt={() => {}}
      {...overrides}
    />
  );
}

// ─── Structural rendering ─────────────────────────────────────────────────────

describe('GameScreen — structural rendering', () => {
  it('renders YOUR FLEET label', () => {
    renderGameScreen();
    expect(screen.getByText('YOUR FLEET')).toBeDefined();
  });

  it('renders ENEMY FLEET label', () => {
    renderGameScreen();
    expect(screen.getByText('ENEMY FLEET')).toBeDefined();
  });

  it('renders COMBAT LOG title', () => {
    renderGameScreen();
    expect(screen.getByText('COMBAT LOG')).toBeDefined();
  });

  it('renders YOUR WATERS board label', () => {
    renderGameScreen();
    expect(screen.getByText('YOUR WATERS')).toBeDefined();
  });

  it('renders ENEMY WATERS board label', () => {
    renderGameScreen();
    expect(screen.getByText('ENEMY WATERS')).toBeDefined();
  });

  it('renders two board grids (own + enemy)', () => {
    renderGameScreen();
    expect(screen.getAllByRole('grid').length).toBe(2);
  });

  it('renders own board with aria-label containing "fleet"', () => {
    const { container } = renderGameScreen();
    const ownGrid = Array.from(container.querySelectorAll('[role="grid"]'))
      .find(g => g.getAttribute('aria-label')?.toLowerCase().includes('fleet'));
    expect(ownGrid).not.toBeUndefined();
  });

  it('renders enemy board with aria-label containing "Enemy waters"', () => {
    const { container } = renderGameScreen();
    const enemyGrid = Array.from(container.querySelectorAll('[role="grid"]'))
      .find(g => g.getAttribute('aria-label')?.includes('Enemy waters'));
    expect(enemyGrid).not.toBeUndefined();
  });
});

// ─── Player turn UI ───────────────────────────────────────────────────────────

describe('GameScreen — player turn UI', () => {
  it('shows SELECT TARGET COORDINATES hint during player turn', () => {
    renderGameScreen({
      gameState: startedGame({ currentTurn: 'player' }),
      aiThinking: false,
    });
    expect(screen.getByText('SELECT TARGET COORDINATES')).toBeDefined();
  });

  it('hides the hint when aiThinking=true (AI has control)', () => {
    renderGameScreen({ aiThinking: true });
    expect(screen.queryByText('SELECT TARGET COORDINATES')).toBeNull();
  });

  it('hides the hint when it is the opponent\'s turn', () => {
    renderGameScreen({
      gameState: startedGame({ currentTurn: 'opponent' }),
      aiThinking: false,
    });
    expect(screen.queryByText('SELECT TARGET COORDINATES')).toBeNull();
  });
});

// ─── Board locked overlay ─────────────────────────────────────────────────────

describe('GameScreen — board locked overlay', () => {
  it('shows STAND BY overlay when opponent turn and AI is not thinking', () => {
    renderGameScreen({
      gameState: startedGame({ currentTurn: 'opponent' }),
      aiThinking: false,
    });
    expect(screen.getByText('STAND BY')).toBeDefined();
  });

  it('shows INCOMING… overlay when aiThinking=true', () => {
    renderGameScreen({ aiThinking: true });
    expect(screen.getByText('INCOMING…')).toBeDefined();
  });

  it('does not show locked overlay during player turn', () => {
    renderGameScreen({
      gameState: startedGame({ currentTurn: 'player' }),
      aiThinking: false,
    });
    expect(screen.queryByText('STAND BY')).toBeNull();
    expect(screen.queryByText('INCOMING…')).toBeNull();
  });
});

// ─── Log passthrough ──────────────────────────────────────────────────────────

describe('GameScreen — log passthrough to CombatLog', () => {
  it('renders all log entry messages', () => {
    renderGameScreen({ log: sampleLog });
    expect(screen.getByText('▸ A1 — HIT')).toBeDefined();
    expect(screen.getByText('◂ ENEMY B3 — MISS')).toBeDefined();
    expect(screen.getByText('BATTLE COMMENCED — FIRE AT WILL')).toBeDefined();
  });

  it('renders no entry elements when log is empty', () => {
    const { container } = renderGameScreen({ log: [] });
    expect(container.querySelectorAll('.combat-log__entry').length).toBe(0);
  });

  it('shows ENEMY TARGETING indicator when aiThinking=true', () => {
    renderGameScreen({ aiThinking: true });
    expect(screen.getByText('◈ ENEMY TARGETING...')).toBeDefined();
  });

  it('hides ENEMY TARGETING indicator when aiThinking=false', () => {
    renderGameScreen({ aiThinking: false });
    expect(screen.queryByText('◈ ENEMY TARGETING...')).toBeNull();
  });
});

// ─── Reveal mode: no keyboard cursor on enemy board ───────────────────────────

describe('GameScreen — reveal mode (revealEnemyShips=true)', () => {
  it('no focused cell on enemy board when revealEnemyShips=true', () => {
    const { container } = renderGameScreen({
      gameState: startedGame({ currentTurn: 'opponent' }),
      aiThinking: false,
      revealEnemyShips: true,
    });
    expect(container.querySelector('.cell--focused')).toBeNull();
  });

  it('no attackable buttons on enemy board during reveal', () => {
    const { container } = renderGameScreen({
      gameState: startedGame({ currentTurn: 'opponent' }),
      aiThinking: false,
      revealEnemyShips: true,
    });
    // During reveal isPlayerTurn=false so onCellClick=undefined → no buttons
    expect(container.querySelectorAll('[role="button"][aria-label="Attack cell"]').length).toBe(0);
  });

  it('keyboard arrows do not show cursor during reveal', () => {
    const { container } = renderGameScreen({
      gameState: startedGame({ currentTurn: 'opponent' }),
      aiThinking: false,
      revealEnemyShips: true,
    });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(container.querySelector('.cell--focused')).toBeNull();
  });
});

// ─── Gameover phase: board locked regardless of currentTurn ──────────────────

describe('GameScreen — gameover phase locks the enemy board', () => {
  it('no attackable cells during gameover even when currentTurn is player', () => {
    const { container } = renderGameScreen({
      gameState: startedGame({ phase: 'gameover', winner: 'player', currentTurn: 'player' }),
      aiThinking: false,
    });
    expect(container.querySelectorAll('[aria-label="Attack cell"]').length).toBe(0);
  });

  it('keyboard does not show cursor on enemy board during gameover phase', () => {
    const { container } = renderGameScreen({
      gameState: startedGame({ phase: 'gameover', winner: 'player', currentTurn: 'player' }),
      aiThinking: false,
    });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(container.querySelector('.cell--focused')).toBeNull();
  });
});