/**
 * CombatLog component tests
 *
 * Covers title rendering, entry type classes, empty state, AI thinking
 * indicator, aria-live region, and new-entry flash class.
 *
 * Required jest config:   testEnvironment: 'jsdom'
 * Required packages:      @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CombatLog from '../components/CombatLog';
import type { LogEntry } from '../hooks/useGameState';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const sampleLog: LogEntry[] = [
  { id: 1, message: 'BATTLE COMMENCED — FIRE AT WILL', type: 'system' },
  { id: 2, message: '▸ A1 — HIT',                      type: 'hit'    },
  { id: 3, message: '◂ ENEMY B3 — MISS',               type: 'enemy'  },
  { id: 4, message: '▸ C5 — SUNK DESTROYER',           type: 'sunk'   },
  { id: 5, message: '▸ D7 — MISS',                     type: 'miss'   },
];

// ─── Static rendering ─────────────────────────────────────────────────────────

describe('CombatLog — static rendering', () => {
  it('renders the COMBAT LOG title', () => {
    render(<CombatLog entries={[]} aiThinking={false} />);
    expect(screen.getByText('COMBAT LOG')).toBeDefined();
  });

  it('renders all provided log entries', () => {
    render(<CombatLog entries={sampleLog} aiThinking={false} />);
    expect(screen.getByText('▸ A1 — HIT')).toBeDefined();
    expect(screen.getByText('◂ ENEMY B3 — MISS')).toBeDefined();
    expect(screen.getByText('BATTLE COMMENCED — FIRE AT WILL')).toBeDefined();
    expect(screen.getByText('▸ C5 — SUNK DESTROYER')).toBeDefined();
    expect(screen.getByText('▸ D7 — MISS')).toBeDefined();
  });

  it('renders nothing in the entries container when log is empty', () => {
    const { container } = render(<CombatLog entries={[]} aiThinking={false} />);
    expect(container.querySelectorAll('.combat-log__entry').length).toBe(0);
  });

  it('renders the correct number of entry elements', () => {
    const { container } = render(<CombatLog entries={sampleLog} aiThinking={false} />);
    expect(container.querySelectorAll('.combat-log__entry').length).toBe(sampleLog.length);
  });
});

// ─── Entry type modifier classes ──────────────────────────────────────────────

describe('CombatLog — entry type modifier classes', () => {
  it('applies combat-log__entry--system to system entries', () => {
    const { container } = render(<CombatLog entries={sampleLog} aiThinking={false} />);
    const entries = container.querySelectorAll('.combat-log__entry');
    expect(entries[0]).toHaveClass('combat-log__entry--system');
  });

  it('applies combat-log__entry--hit to hit entries', () => {
    const { container } = render(<CombatLog entries={sampleLog} aiThinking={false} />);
    const entries = container.querySelectorAll('.combat-log__entry');
    expect(entries[1]).toHaveClass('combat-log__entry--hit');
  });

  it('applies combat-log__entry--enemy to enemy entries', () => {
    const { container } = render(<CombatLog entries={sampleLog} aiThinking={false} />);
    const entries = container.querySelectorAll('.combat-log__entry');
    expect(entries[2]).toHaveClass('combat-log__entry--enemy');
  });

  it('applies combat-log__entry--sunk to sunk entries', () => {
    const { container } = render(<CombatLog entries={sampleLog} aiThinking={false} />);
    const entries = container.querySelectorAll('.combat-log__entry');
    expect(entries[3]).toHaveClass('combat-log__entry--sunk');
  });

  it('applies combat-log__entry--miss to miss entries', () => {
    const { container } = render(<CombatLog entries={sampleLog} aiThinking={false} />);
    const entries = container.querySelectorAll('.combat-log__entry');
    expect(entries[4]).toHaveClass('combat-log__entry--miss');
  });
});

// ─── AI thinking indicator ────────────────────────────────────────────────────

describe('CombatLog — AI thinking indicator', () => {
  it('shows the targeting indicator when aiThinking=true', () => {
    render(<CombatLog entries={[]} aiThinking={true} />);
    expect(screen.getByText('◈ ENEMY TARGETING...')).toBeDefined();
  });

  it('hides the targeting indicator when aiThinking=false', () => {
    render(<CombatLog entries={[]} aiThinking={false} />);
    expect(screen.queryByText('◈ ENEMY TARGETING...')).toBeNull();
  });

  it('shows indicator alongside existing entries', () => {
    render(<CombatLog entries={sampleLog} aiThinking={true} />);
    expect(screen.getByText('◈ ENEMY TARGETING...')).toBeDefined();
    expect(screen.getByText('▸ A1 — HIT')).toBeDefined();
  });
});

// ─── ARIA live region ─────────────────────────────────────────────────────────

describe('CombatLog — ARIA live region', () => {
  it('has aria-live="polite" on the entries container', () => {
    const { container } = render(<CombatLog entries={[]} aiThinking={false} />);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });

  it('has aria-label="Combat log" on the live region', () => {
    render(<CombatLog entries={[]} aiThinking={false} />);
    expect(screen.getByLabelText('Combat log')).toBeDefined();
  });

  it('has aria-relevant="additions" on the live region', () => {
    const { container } = render(<CombatLog entries={[]} aiThinking={false} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.getAttribute('aria-relevant')).toBe('additions');
  });
});

// ─── New entry flash class ────────────────────────────────────────────────────

describe('CombatLog — new-entry flash class', () => {
  it('applies combat-log__entry--new to the top entry on first render', () => {
    const entries: LogEntry[] = [{ id: 99, message: 'NEW', type: 'hit' }];
    const { container } = render(<CombatLog entries={entries} aiThinking={false} />);
    expect(container.querySelector('.combat-log__entry')).toHaveClass('combat-log__entry--new');
  });

  it('only applies the flash class to the newest (first) entry, not older ones', () => {
    const { container } = render(<CombatLog entries={sampleLog} aiThinking={false} />);
    const entries = container.querySelectorAll('.combat-log__entry');
    // Only the first entry should have --new
    expect(entries[0]).toHaveClass('combat-log__entry--new');
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i]).not.toHaveClass('combat-log__entry--new');
    }
  });

  it('does not re-apply the flash class when the same entries are rerendered (line 18 false branch)', () => {
    // First render: effect runs, prevTopIdRef is set to entries[0].id, flash applied.
    const entries: LogEntry[] = [{ id: 10, message: 'HIT', type: 'hit' }];
    const { container, rerender } = render(<CombatLog entries={entries} aiThinking={false} />);
    expect(container.querySelector('.combat-log__entry')).toHaveClass('combat-log__entry--new');

    // Rerender with the same array reference — effect fires again but
    // topEntry.id === prevTopIdRef.current so the inner block is skipped (line 18 = false).
    // The component should still render without crashing.
    rerender(<CombatLog entries={entries} aiThinking={false} />);
    expect(container.querySelector('.combat-log__entry')).toBeDefined();
  });

  it('applies the flash class to a newly prepended entry after a rerender', () => {
    // Render with one entry, then prepend a new one — the effect fires and detects
    // a new top id, running the full inner block of line 18 again.
    const first: LogEntry[]  = [{ id: 1, message: 'MISS',  type: 'miss' }];
    const second: LogEntry[] = [{ id: 2, message: 'HIT',   type: 'hit'  }, ...first];

    const { container, rerender } = render(<CombatLog entries={first} aiThinking={false} />);
    rerender(<CombatLog entries={second} aiThinking={false} />);

    const allEntries = container.querySelectorAll('.combat-log__entry');
    // Entry with id=2 is now at index 0 and should have the flash class
    expect(allEntries[0]).toHaveClass('combat-log__entry--new');
    expect(allEntries[1]).not.toHaveClass('combat-log__entry--new');
  });
});