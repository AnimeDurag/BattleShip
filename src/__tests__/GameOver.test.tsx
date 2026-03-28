/**
 * GameOver component tests
 *
 * Covers victory/defeat titles, subtitle wording (shotCount vs turnCount),
 * score calculation, all five rank tiers and their thresholds, General star,
 * rank scale active item, commentary text, session stats panel visibility
 * and all stat values, restart button, and accent bar class.
 *
 * Required jest config:   testEnvironment: 'jsdom'
 * Required packages:      @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameOver from '../components/GameOver';
import { initialSessionStats, applyResult } from '../hooks/useSessionStats';
import type { SessionStats, GameResult } from '../hooks/useSessionStats';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeStats(results: GameResult[]): SessionStats {
  return results.reduce(applyResult, initialSessionStats());
}

function win(shots = 20): GameResult {
  return { winner: 'player', shotCount: shots, difficulty: 'medium' };
}

function loss(shots = 60): GameResult {
  return { winner: 'opponent', shotCount: shots, difficulty: 'medium' };
}

const oneWin  = makeStats([win()]);
const oneLoss = makeStats([loss()]);

function renderGameOver(overrides: Partial<Parameters<typeof GameOver>[0]> = {}) {
  return render(
    <GameOver
      winner="player"
      shotCount={17}
      turnCount={33}
      difficulty="medium"
      sessionStats={oneWin}
      onRestart={() => {}}
      onViewBoard={() => {}}
      {...overrides}
    />
  );
}

// ─── Victory path ─────────────────────────────────────────────────────────────

describe('GameOver — victory path', () => {
  it('renders VICTORY title on player win', () => {
    renderGameOver({ winner: 'player' });
    expect(screen.getByText('VICTORY')).toBeDefined();
  });

  it('subtitle shows shotCount (17) as MISSILES FIRED on victory', () => {
    renderGameOver({ winner: 'player', shotCount: 17, turnCount: 33 });
    expect(screen.getByText(/17 MISSILES FIRED/)).toBeDefined();
  });

  it('subtitle does NOT show turnCount (33) as MISSILES FIRED on victory', () => {
    renderGameOver({ winner: 'player', shotCount: 17, turnCount: 33 });
    expect(screen.queryByText(/33 MISSILES FIRED/)).toBeNull();
  });

  it('renders the EFFICIENCY label', () => {
    renderGameOver({ winner: 'player' });
    expect(screen.getByText('EFFICIENCY')).toBeDefined();
  });

  it('renders 100% score for a perfect 17-shot game', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 17 });
    // 100% also appears in WIN RATE when sessionStats has a perfect record —
    // query the score number element directly to avoid the ambiguity
    expect(container.querySelector('.gameover-perf__score-num')?.textContent).toBe('100%');
  });

  it('renders the RANK ACHIEVED label', () => {
    renderGameOver({ winner: 'player' });
    expect(screen.getByText('RANK ACHIEVED')).toBeDefined();
  });
});

// ─── Rank tiers ───────────────────────────────────────────────────────────────

describe('GameOver — rank tiers', () => {
  it('awards GENERAL OF THE ARMIES for 17 shots (score 100)', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 17 });
    expect(container.querySelector('.gameover-rank__name')?.textContent).toBe('GENERAL OF THE ARMIES');
  });

  it('shows the General star (★) for GENERAL rank', () => {
    renderGameOver({ winner: 'player', shotCount: 17 });
    expect(screen.getByText('★')).toBeDefined();
  });

  it('awards ADMIRAL for 18 shots (score 94 — in 90–99 band)', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 18 });
    expect(container.querySelector('.gameover-rank__name')?.textContent).toBe('ADMIRAL');
  });

  it('does not show the General star for ADMIRAL rank', () => {
    renderGameOver({ winner: 'player', shotCount: 18 });
    expect(screen.queryByText('★')).toBeNull();
  });

  it('awards CAPTAIN for 20 shots (score 85 — in 69–89 band)', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 20 });
    expect(container.querySelector('.gameover-rank__name')?.textContent).toBe('CAPTAIN');
  });

  it('awards SERGEANT for 30 shots (score 56 — in 36–68 band)', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 30 });
    expect(container.querySelector('.gameover-rank__name')?.textContent).toBe('SERGEANT');
  });

  it('awards PRIVATE for 50 shots (score 34 — below 36)', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 50 });
    expect(container.querySelector('.gameover-rank__name')?.textContent).toBe('PRIVATE');
  });
});

// ─── Rank scale ───────────────────────────────────────────────────────────────

describe('GameOver — rank scale', () => {
  it('renders all five rank scale items', () => {
    renderGameOver({ winner: 'player', shotCount: 17 });
    expect(screen.getByText('PRIVATE')).toBeDefined();
    expect(screen.getByText('SERGEANT')).toBeDefined();
    expect(screen.getByText('CAPTAIN')).toBeDefined();
    expect(screen.getByText('ADMIRAL')).toBeDefined();
    // GENERAL OF THE ARMIES appears in both the rank badge and the scale — use getAllByText
    expect(screen.getAllByText('GENERAL OF THE ARMIES').length).toBeGreaterThanOrEqual(1);
  });

  it('marks the current rank as active on the rank scale', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 17 });
    const active = container.querySelector('.gameover-rank-scale__item--active');
    expect(active).not.toBeNull();
    expect(active?.textContent).toBe('GENERAL OF THE ARMIES');
  });

  it('marks CAPTAIN as active for a 20-shot game', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 20 });
    const active = container.querySelector('.gameover-rank-scale__item--active');
    expect(active?.textContent).toBe('CAPTAIN');
  });

  it('marks only one item as active', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 20 });
    expect(container.querySelectorAll('.gameover-rank-scale__item--active').length).toBe(1);
  });
});

// ─── Commentary ───────────────────────────────────────────────────────────────

describe('GameOver — commentary', () => {
  it('shows FLAWLESS VICTORY commentary for a perfect 17-shot game', () => {
    renderGameOver({ winner: 'player', shotCount: 17, difficulty: 'medium' });
    expect(screen.getByText(/FLAWLESS VICTORY/)).toBeDefined();
  });

  it('renders a non-empty commentary string for imperfect play', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 25, difficulty: 'easy' });
    // The session stats panel renders 'ENGAGEMENTS' which also matches the regex —
    // query the commentary paragraph directly to avoid the ambiguity
    const commentary = container.querySelector('.gameover-perf__commentary')?.textContent ?? '';
    expect(commentary).toMatch(/ENGAGEMENT|OPERATION|PROLONGED|COMPETENT|INEFFICIENT|HIGHLY EFFICIENT/);
  });

  it('does not render commentary when difficulty is null', () => {
    const { container } = renderGameOver({ winner: 'player', shotCount: 17, difficulty: null });
    expect(container.querySelector('.gameover-perf__commentary')?.textContent).toBe('');
  });
});

// ─── Defeat path ──────────────────────────────────────────────────────────────

describe('GameOver — defeat path', () => {
  it('renders DEFEATED title on opponent win', () => {
    renderGameOver({ winner: 'opponent' });
    expect(screen.getByText('DEFEATED')).toBeDefined();
  });

  it('subtitle shows turnCount as ROUNDS ELAPSED on defeat', () => {
    renderGameOver({ winner: 'opponent', shotCount: 33 });
    expect(screen.getByText(/33 ROUNDS ELAPSED/)).toBeDefined();
  });

  it('does not render RANK ACHIEVED on defeat', () => {
    renderGameOver({ winner: 'opponent' });
    expect(screen.queryByText('RANK ACHIEVED')).toBeNull();
  });

  it('does not render EFFICIENCY on defeat', () => {
    renderGameOver({ winner: 'opponent' });
    expect(screen.queryByText('EFFICIENCY')).toBeNull();
  });

  it('does not render the General star on defeat', () => {
    renderGameOver({ winner: 'opponent' });
    expect(screen.queryByText('★')).toBeNull();
  });
});

// ─── Session stats panel ──────────────────────────────────────────────────────

describe('GameOver — session stats panel', () => {
  it('renders SESSION RECORD when gamesPlayed > 0', () => {
    renderGameOver({ sessionStats: oneWin });
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });

  it('does not render SESSION RECORD when gamesPlayed = 0', () => {
    renderGameOver({ sessionStats: initialSessionStats() });
    expect(screen.queryByText('SESSION RECORD')).toBeNull();
  });

  it('shows correct ENGAGEMENTS count', () => {
    renderGameOver({ sessionStats: makeStats([win(), loss()]) });
    expect(screen.getByText('ENGAGEMENTS')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('shows correct VICTORIES count', () => {
    const { container } = renderGameOver({ sessionStats: makeStats([win(), win(), loss()]) });
    expect(screen.getByText('VICTORIES')).toBeDefined();
    // wins=2 and bestWinStreak=2 both render '2' — find the VICTORIES cell specifically
    const victoriesCell = Array.from(container.querySelectorAll('.gameover-stats__cell'))
      .find(el => el.querySelector('.gameover-stats__key')?.textContent === 'VICTORIES');
    expect(victoriesCell?.querySelector('.gameover-stats__val')?.textContent).toBe('2');
  });

  it('shows correct DEFEATS count', () => {
    renderGameOver({ sessionStats: makeStats([loss(), loss()]) });
    expect(screen.getByText('DEFEATS')).toBeDefined();
  });

  it('shows 100% WIN RATE after all wins', () => {
    renderGameOver({ winner: 'player', shotCount: 25, sessionStats: makeStats([win(), win()]) });
    // The 100% from win rate — not from score
    expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows 0% WIN RATE after all losses', () => {
    renderGameOver({ winner: 'opponent', sessionStats: makeStats([loss(), loss()]) });
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('shows best score percentage when victories exist', () => {
    renderGameOver({ winner: 'player', shotCount: 17, sessionStats: makeStats([win(17)]) });
    const hundreds = screen.getAllByText('100%');
    expect(hundreds.length).toBeGreaterThanOrEqual(1);
  });

  it('shows em-dash for BEST SCORE when no victories in session', () => {
    renderGameOver({ winner: 'opponent', sessionStats: makeStats([loss()]) });
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows STREAK label and count', () => {
    const { container } = renderGameOver({ sessionStats: makeStats([win(), win(), win()]) });
    expect(screen.getByText('STREAK')).toBeDefined();
    // wins=3, winStreak=3, bestWinStreak=3, gamesPlayed=3 all render '3' — find the streak cell specifically
    const streakCell = Array.from(container.querySelectorAll('.gameover-stats__cell'))
      .find(el => el.querySelector('.gameover-stats__key')?.textContent === 'STREAK');
    expect(streakCell?.querySelector('.gameover-stats__val')?.textContent).toBe('3');
  });

  it('shows BEST STREAK label', () => {
    renderGameOver({ sessionStats: makeStats([win(), win(), loss(), win()]) });
    expect(screen.getByText('BEST STREAK')).toBeDefined();
  });

  it('shows AVG SHOTS label', () => {
    renderGameOver({ sessionStats: makeStats([win(30)]) });
    expect(screen.getByText('AVG SHOTS')).toBeDefined();
  });
});

// ─── Restart button ───────────────────────────────────────────────────────────

describe('GameOver — restart button', () => {
  it('renders the NEW BATTLE button', () => {
    renderGameOver();
    expect(screen.getByText('⟳ NEW BATTLE')).toBeDefined();
  });

  it('calls onRestart when the button is clicked', () => {
    const onRestart = jest.fn();
    renderGameOver({ onRestart });
    fireEvent.click(screen.getByText('⟳ NEW BATTLE'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('does not call onRestart before the button is clicked', () => {
    const onRestart = jest.fn();
    renderGameOver({ onRestart });
    expect(onRestart).not.toHaveBeenCalled();
  });
});

// ─── Accent bar ───────────────────────────────────────────────────────────────

describe('GameOver — accent bar class', () => {
  it('does NOT apply the defeat modifier on victory', () => {
    const { container } = renderGameOver({ winner: 'player' });
    expect(container.querySelector('.gameover-panel__accent'))
      .not.toHaveClass('gameover-panel__accent--defeat');
  });

  it('applies the defeat modifier on loss', () => {
    const { container } = renderGameOver({ winner: 'opponent' });
    expect(container.querySelector('.gameover-panel__accent'))
      .toHaveClass('gameover-panel__accent--defeat');
  });
});

// ─── Session stats — WIN RATE and AVG SHOTS values (lines 128–132) ────────────

describe('GameOver — WIN RATE and AVG SHOTS cell values', () => {
  function getStatValue(container: HTMLElement, label: string): string {
    const cell = Array.from(container.querySelectorAll('.gameover-stats__cell'))
      .find(el => el.querySelector('.gameover-stats__key')?.textContent === label);
    return cell?.querySelector('.gameover-stats__val')?.textContent ?? '';
  }

  it('WIN RATE cell renders the computed percentage (line 128 truthy branch)', () => {
    // 1 win, 1 loss → 50% win rate. wr is non-null so the `${wr}%` branch runs.
    const { container } = renderGameOver({
      winner:       'opponent',
      sessionStats: makeStats([win(), loss()]),
    });
    expect(getStatValue(container, 'WIN RATE')).toBe('50%');
  });

  it('AVG SHOTS cell renders the computed average (line 132 truthy branch)', () => {
    // win(30) + loss(50) → totalShots=80, gamesPlayed=2, avg=40
    const { container } = renderGameOver({
      winner:       'opponent',
      sessionStats: makeStats([win(30), loss(50)]),
    });
    expect(getStatValue(container, 'AVG SHOTS')).toBe('40');
  });
});

// ─── Close button (view board) ────────────────────────────────────────────────

describe('GameOver — close button (view board)', () => {
  it('renders a close button with aria-label "Close and view board"', () => {
    renderGameOver();
    expect(screen.getByLabelText('Close and view board')).toBeDefined();
  });

  it('calls onViewBoard when the close button is clicked', () => {
    const onViewBoard = jest.fn();
    renderGameOver({ onViewBoard });
    fireEvent.click(screen.getByLabelText('Close and view board'));
    expect(onViewBoard).toHaveBeenCalledTimes(1);
  });

  it('close button contains ✕ character', () => {
    const { container } = renderGameOver();
    const btn = container.querySelector('.gameover-panel__close');
    expect(btn?.textContent).toBe('✕');
  });

  it('close button is positioned inside the panel (not overlay)', () => {
    const { container } = renderGameOver();
    const panel = container.querySelector('.gameover-panel');
    const btn   = container.querySelector('.gameover-panel__close');
    expect(panel?.contains(btn)).toBe(true);
  });
});

// ─── NEW BATTLE moved to top ──────────────────────────────────────────────────

describe('GameOver — NEW BATTLE at top of panel', () => {
  it('renders the NEW BATTLE button', () => {
    renderGameOver();
    expect(screen.getByText('⟳ NEW BATTLE')).toBeDefined();
  });

  it('NEW BATTLE button is inside gameover-panel__topbar', () => {
    const { container } = renderGameOver();
    const topbar = container.querySelector('.gameover-panel__topbar');
    expect(topbar?.querySelector('.gameover-panel__new-battle')).not.toBeNull();
  });

  it('NEW BATTLE button appears before the title in DOM order', () => {
    const { container } = renderGameOver();
    const panel   = container.querySelector('.gameover-panel')!;
    const children = Array.from(panel.children);
    const topbarIdx = children.findIndex(el => el.classList.contains('gameover-panel__topbar'));
    const titleIdx  = children.findIndex(el => el.classList.contains('gameover-panel__title'));
    expect(topbarIdx).toBeLessThan(titleIdx);
  });

  it('calls onRestart when NEW BATTLE is clicked', () => {
    const onRestart = jest.fn();
    renderGameOver({ onRestart });
    fireEvent.click(screen.getByText('⟳ NEW BATTLE'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});