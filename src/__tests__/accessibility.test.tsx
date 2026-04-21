/**
 * Accessibility smoke tests — WCAG 2.1 AA compliance checks
 *
 * Verifies the most critical ARIA attributes across all interactive
 * components. These supplement (not replace) existing component tests.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import GameOver from '../components/GameOver';
import PvPHandoffScreen from '../components/PvPHandoffScreen';
import AudioGateScreen from '../components/AudioGateScreen';
import CombatLog from '../components/CombatLog';
import BoardGrid from '../components/BoardGrid';
import PvPGameOver from '../components/PvPGameOver';
import { initialSessionStats } from '../hooks/useSessionStats';
import { createBoard } from '../models/Board';
import type { LogEntry } from '../hooks/useGameState';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGameOver(winner: 'player' | 'opponent') {
  return render(
    <GameOver
      winner={winner}
      shotCount={30}
      difficulty="easy"
      sessionStats={initialSessionStats()}
      onRestart={() => {}}
    />
  );
}

// ─── GameOver ─────────────────────────────────────────────────────────────────

describe('accessibility — GameOver', () => {
  it('has role="dialog"', () => {
    const { container } = makeGameOver('player');
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('has aria-modal="true"', () => {
    const { container } = makeGameOver('player');
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
  });

  it('dialog aria-label is "Victory" for player win', () => {
    const { container } = makeGameOver('player');
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Victory');
  });

  it('dialog aria-label is "Defeated" for opponent win', () => {
    const { container } = makeGameOver('opponent');
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Defeated');
  });

  it('NEW BATTLE button is present and has text', () => {
    makeGameOver('player');
    const btn = screen.getByRole('button', { name: /new battle/i });
    expect(btn).toBeDefined();
    expect((btn as HTMLButtonElement).textContent?.trim()).not.toBe('');
  });
});

// ─── PvPHandoffScreen ─────────────────────────────────────────────────────────

describe('accessibility — PvPHandoffScreen', () => {
  function renderHandoff() {
    return render(
      <PvPHandoffScreen
        message="PLAYER 1'S TURN"
        onAdvance={() => {}}
        onPlayEffect={() => {}}
      />
    );
  }

  it('has role="alertdialog"', () => {
    const { container } = renderHandoff();
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('has aria-modal="true"', () => {
    const { container } = renderHandoff();
    expect(container.querySelector('[role="alertdialog"]')?.getAttribute('aria-modal')).toBe('true');
  });

  it('aria-label matches the message prop', () => {
    const { container } = renderHandoff();
    expect(container.querySelector('[role="alertdialog"]')?.getAttribute('aria-label')).toBe("PLAYER 1'S TURN");
  });
});

// ─── AudioGateScreen ──────────────────────────────────────────────────────────

describe('accessibility — AudioGateScreen', () => {
  function renderGate() {
    return render(<AudioGateScreen onUnlock={() => {}} />);
  }

  it('has role="dialog"', () => {
    const { container } = renderGate();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('has aria-modal="true"', () => {
    const { container } = renderGate();
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
  });

  it('has aria-label', () => {
    const { container } = renderGate();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).not.toBeNull();
    expect(dialog?.getAttribute('aria-label')?.trim()).not.toBe('');
  });

  it('has tabIndex=0 so it can receive keyboard focus', () => {
    const { container } = renderGate();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('tabindex')).toBe('0');
  });

  it('calls onUnlock on Enter keydown', () => {
    const onUnlock = jest.fn();
    const { container } = render(<AudioGateScreen onUnlock={onUnlock} />);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    fireEvent.keyDown(dialog, { key: 'Enter' });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('calls onUnlock on Space keydown', () => {
    const onUnlock = jest.fn();
    const { container } = render(<AudioGateScreen onUnlock={onUnlock} />);
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    fireEvent.keyDown(dialog, { key: ' ' });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});

// ─── CombatLog ────────────────────────────────────────────────────────────────

describe('accessibility — CombatLog', () => {
  const entries: LogEntry[] = [
    { id: 1, type: 'hit', message: 'Hit at A1' },
    { id: 2, type: 'miss', message: 'Missed at B2' },
  ];

  it('has aria-live="polite"', () => {
    const { container } = render(<CombatLog entries={entries} aiThinking={false} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
  });

  it('has aria-atomic="false"', () => {
    const { container } = render(<CombatLog entries={entries} aiThinking={false} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.getAttribute('aria-atomic')).toBe('false');
  });

  it('has aria-relevant="additions"', () => {
    const { container } = render(<CombatLog entries={entries} aiThinking={false} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.getAttribute('aria-relevant')).toBe('additions');
  });

  it('has aria-label="Combat log"', () => {
    render(<CombatLog entries={entries} aiThinking={false} />);
    expect(screen.getByLabelText('Combat log')).not.toBeNull();
  });
});

// ─── BoardGrid — enemy board ──────────────────────────────────────────────────

describe('accessibility — BoardGrid (enemy board)', () => {
  it('enemy board has role="grid"', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" />
    );
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });

  it('enemy board has aria-label containing "Enemy waters"', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" />
    );
    const grid = container.querySelector('[role="grid"]');
    expect(grid?.getAttribute('aria-label')).toContain('Enemy waters');
  });

  it('enemy board in playing phase has aria-live="polite"', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={() => {}} />
    );
    const grid = container.querySelector('[role="grid"]');
    expect(grid?.getAttribute('aria-live')).toBe('polite');
  });
});

// ─── BoardGrid — own board ────────────────────────────────────────────────────

describe('accessibility — BoardGrid (own board)', () => {
  it('own board has role="grid" by default', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="playing" />
    );
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });

  it('own board with boardRole="img" has role="img"', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="playing" boardRole="img" />
    );
    expect(container.querySelector('[role="img"]')).not.toBeNull();
    expect(container.querySelector('[role="grid"]')).toBeNull();
  });

  it('own board aria-label contains "fleet"', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="playing" />
    );
    const grid = container.querySelector('[role="grid"]');
    expect(grid?.getAttribute('aria-label')?.toLowerCase()).toContain('fleet');
  });
});

// ─── PvPGameOver ─────────────────────────────────────────────────────────────

describe('accessibility — PvPGameOver', () => {
  function renderPvPGameOver() {
    return render(
      <PvPGameOver
        winner={1}
        p1Shots={40}
        p2Shots={45}
        p1Hits={17}
        p2Hits={15}
        onRestart={() => {}}
      />
    );
  }

  it('has role="dialog"', () => {
    const { container } = renderPvPGameOver();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('has aria-modal="true"', () => {
    const { container } = renderPvPGameOver();
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
  });

  it('aria-label reflects the winner', () => {
    const { container } = renderPvPGameOver();
    const label = container.querySelector('[role="dialog"]')?.getAttribute('aria-label') ?? '';
    expect(label.toLowerCase()).toContain('player 1');
  });
});
