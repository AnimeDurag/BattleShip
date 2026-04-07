/**
 * GameOver component tests — complete suite
 *
 * Scoring reference (new formula):
 *   score = min(100, floor( SCORING_BASELINE × 100 × DIFFICULTY_MULTIPLIER[diff] / shots ))
 *   SCORING_BASELINE = 24
 *
 * Easy difficulty rank windows (DIFFICULTY_MULTIPLIER.easy = 1.0):
 *   General  (100)   : ≤ 24 shots   e.g. 24 shots → score 100
 *   Admiral  (90–99) : 25–26 shots   e.g. 25 shots → score 96
 *   Captain  (69–89) : 27–34 shots   e.g. 30 shots → score 80
 *   Sergeant (36–68) : 35–66 shots   e.g. 50 shots → score 48
 *   Private  (0–35)  : 67+ shots     e.g. 70 shots → score 34
 *
 * Difficulty par values: easy=60  medium=45  hard=40  sweaty=38
 *
 * Commentary branch triggers:
 *   FLAWLESS VICTORY    : 24 shots on easy   (score=100, shots≤par=60)
 *   AHEAD OF PROJECTED  : 38 shots on sweaty (score=94,  shots≤par=38)
 *   HIGHLY EFFICIENT    : 39 shots on sweaty (score=92,  shots>par=38)
 *   COMPETENT EXECUTION : 42 shots on sweaty (score=85,  shots>par=38)
 *   PROLONGED ENGAGEMENT: 61 shots on easy   (score=39,  shots>par=60)
 *   INEFFICIENT OPERATION:67 shots on easy   (score=35,  shots>par=60)
 *
 * NOTE ON RANK NAME QUERIES
 * The component renders the awarded rank name in two places:
 *   • .gameover-rank__name  (badge — the "awarded" text)
 *   • .gameover-rank-scale__item--active  (scale — the highlighted tier)
 *
 * Using screen.getByText('ADMIRAL') therefore finds two elements and throws.
 * All "which rank was awarded" assertions use the rankName() helper which
 * scopes to .gameover-rank__name, and the "all five labels" test scopes to
 * the scale container. Other assertions (star, %, CSS classes) are unaffected.
 *
 * Required jest config:  testEnvironment: 'jsdom'
 * Required packages:     @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameOver from '../components/GameOver';
import { initialSessionStats } from '../hooks/useSessionStats';
import type { SessionStats } from '../hooks/useSessionStats';
import type { Difficulty } from '../models/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RenderOpts {
  difficulty?: Difficulty | null;
  sessionStats?: SessionStats;
  onRestart?: () => void;
  onViewBoard?: () => void;
}

function renderGameOver(
  winner: 'player' | 'opponent',
  shotCount: number,
  opts: RenderOpts = {}
) {
  const {
    difficulty = 'easy',
    sessionStats = initialSessionStats(),
    onRestart = () => {},
    onViewBoard,
  } = opts;

  return render(
    <GameOver
      winner={winner}
      shotCount={shotCount}
      difficulty={difficulty}
      sessionStats={sessionStats}
      onRestart={onRestart}
      onViewBoard={onViewBoard}
    />
  );
}

/**
 * Returns the text content of the rank badge name element.
 *
 * The awarded rank name appears in BOTH .gameover-rank__name (badge) and
 * .gameover-rank-scale__item--active (scale). screen.getByText() finds both
 * and throws. Querying .gameover-rank__name directly returns exactly one
 * element — the badge — which is what all "which rank was awarded" tests care
 * about.
 */
function rankName(container: HTMLElement): string {
  return container.querySelector('.gameover-rank__name')?.textContent ?? '';
}

// ─── Title and subtitle ───────────────────────────────────────────────────────

describe('GameOver — title and subtitle', () => {
  it('shows VICTORY title for player win', () => {
    renderGameOver('player', 25);
    expect(screen.getByText('VICTORY')).toBeDefined();
    expect(screen.queryByText('DEFEATED')).toBeNull();
  });

  it('shows DEFEATED title for opponent win', () => {
    renderGameOver('opponent', 40);
    expect(screen.getByText('DEFEATED')).toBeDefined();
    expect(screen.queryByText('VICTORY')).toBeNull();
  });

  it('shows missiles-fired subtitle for victory', () => {
    renderGameOver('player', 25);
    expect(screen.getByText('ENEMY FLEET DESTROYED — 25 MISSILES FIRED')).toBeDefined();
  });

  it('shows rounds-elapsed subtitle for defeat', () => {
    renderGameOver('opponent', 40);
    expect(screen.getByText('YOUR FLEET HAS BEEN SUNK — 40 ROUNDS ELAPSED')).toBeDefined();
  });

  it('subtitle reflects the exact shotCount prop for victory', () => {
    renderGameOver('player', 30);
    expect(screen.getByText('ENEMY FLEET DESTROYED — 30 MISSILES FIRED')).toBeDefined();
  });

  it('subtitle reflects the exact shotCount prop for defeat', () => {
    renderGameOver('opponent', 55);
    expect(screen.getByText('YOUR FLEET HAS BEEN SUNK — 55 ROUNDS ELAPSED')).toBeDefined();
  });
});

// ─── Performance section visibility ──────────────────────────────────────────

describe('GameOver — performance section visibility', () => {
  it('shows score section for player victory', () => {
    renderGameOver('player', 25);
    expect(screen.getByText('EFFICIENCY')).toBeDefined();
    expect(screen.getByText('RANK ACHIEVED')).toBeDefined();
  });

  it('does not show score section for defeat', () => {
    renderGameOver('opponent', 40);
    expect(screen.queryByText('EFFICIENCY')).toBeNull();
    expect(screen.queryByText('RANK ACHIEVED')).toBeNull();
  });
});

// ─── CSS classes ──────────────────────────────────────────────────────────────

describe('GameOver — CSS classes', () => {
  it('accent bar has defeat modifier for opponent win', () => {
    const { container } = renderGameOver('opponent', 40);
    const accent = container.querySelector('.gameover-panel__accent');
    expect(accent?.className).toContain('gameover-panel__accent--defeat');
  });

  it('accent bar does not have defeat modifier for player win', () => {
    const { container } = renderGameOver('player', 25);
    const accent = container.querySelector('.gameover-panel__accent');
    expect(accent?.className).not.toContain('gameover-panel__accent--defeat');
  });

  it('title has victory CSS modifier for player win', () => {
    const { container } = renderGameOver('player', 25);
    const title = container.querySelector('.gameover-panel__title');
    expect(title?.className).toContain('gameover-panel__title--victory');
    expect(title?.className).not.toContain('gameover-panel__title--defeat');
  });

  it('title has defeat CSS modifier for opponent win', () => {
    const { container } = renderGameOver('opponent', 40);
    const title = container.querySelector('.gameover-panel__title');
    expect(title?.className).toContain('gameover-panel__title--defeat');
    expect(title?.className).not.toContain('gameover-panel__title--victory');
  });

  it('rank badge class includes the tier name for each rank', () => {
    const cases: [number, string][] = [
      [24, 'general'],
      [25, 'admiral'],
      [30, 'captain'],
      [50, 'sergeant'],
      [70, 'private'],
    ];
    for (const [shots, tier] of cases) {
      const { container, unmount } = renderGameOver('player', shots);
      expect(container.querySelector('.gameover-rank')?.className)
        .toContain(`gameover-rank--${tier}`);
      unmount();
    }
  });
});

// ─── Rank tiers ───────────────────────────────────────────────────────────────

describe('GameOver — rank tiers', () => {
  it('awards GENERAL for exactly 24 shots (score 100 — new SCORING_BASELINE)', () => {
    const { container } = renderGameOver('player', 24);
    expect(rankName(container)).toBe('GENERAL OF THE ARMIES');
  });

  it('awards GENERAL for fewer than 24 shots (all clamp to 100)', () => {
    const { container } = renderGameOver('player', 17); // MIN_SHOTS_TO_WIN — still General
    expect(rankName(container)).toBe('GENERAL OF THE ARMIES');
  });

  it('shows the General star for GENERAL rank', () => {
    renderGameOver('player', 24);
    expect(screen.getByText('★')).toBeDefined();
  });

  it('awards ADMIRAL for 25 shots (score 96 — in 90–99 band)', () => {
    const { container } = renderGameOver('player', 25);
    expect(rankName(container)).toBe('ADMIRAL');
  });

  it('awards ADMIRAL for 26 shots (score 92 — interior of admiral band)', () => {
    const { container } = renderGameOver('player', 26);
    expect(rankName(container)).toBe('ADMIRAL');
  });

  it('does not show the General star for ADMIRAL rank', () => {
    renderGameOver('player', 25);
    expect(screen.queryByText('★')).toBeNull();
  });

  it('awards CAPTAIN for 27 shots (score 88 — top of captain band)', () => {
    const { container } = renderGameOver('player', 27);
    expect(rankName(container)).toBe('CAPTAIN');
  });

  it('awards CAPTAIN for 30 shots (score 80 — interior of captain band)', () => {
    const { container } = renderGameOver('player', 30);
    expect(rankName(container)).toBe('CAPTAIN');
  });

  it('awards CAPTAIN for 34 shots (score 70 — floor of captain band)', () => {
    const { container } = renderGameOver('player', 34);
    expect(rankName(container)).toBe('CAPTAIN');
  });

  it('awards SERGEANT for 35 shots (score 68 — top of sergeant band)', () => {
    const { container } = renderGameOver('player', 35);
    expect(rankName(container)).toBe('SERGEANT');
  });

  it('awards SERGEANT for 50 shots (score 48 — interior of sergeant band)', () => {
    const { container } = renderGameOver('player', 50);
    expect(rankName(container)).toBe('SERGEANT');
  });

  it('awards SERGEANT for 66 shots (score 36 — floor of sergeant band)', () => {
    const { container } = renderGameOver('player', 66);
    expect(rankName(container)).toBe('SERGEANT');
  });

  it('awards PRIVATE for 67 shots (score 35 — top of private band)', () => {
    const { container } = renderGameOver('player', 67);
    expect(rankName(container)).toBe('PRIVATE');
  });

  it('awards PRIVATE for 70 shots (score 34 — interior of private band)', () => {
    const { container } = renderGameOver('player', 70);
    expect(rankName(container)).toBe('PRIVATE');
  });

  it('one-shot past General boundary → Admiral (25 shots = score 96)', () => {
    const { container } = renderGameOver('player', 25);
    expect(rankName(container)).toBe('ADMIRAL');
  });

  it('one-shot past Admiral boundary → Captain (27 shots = score 88)', () => {
    const { container } = renderGameOver('player', 27);
    expect(rankName(container)).toBe('CAPTAIN');
  });

  it('one-shot past Captain boundary → Sergeant (35 shots = score 68)', () => {
    const { container } = renderGameOver('player', 35);
    expect(rankName(container)).toBe('SERGEANT');
  });

  it('one-shot past Sergeant boundary → Private (67 shots = score 35)', () => {
    const { container } = renderGameOver('player', 67);
    expect(rankName(container)).toBe('PRIVATE');
  });
});

// ─── Score display ────────────────────────────────────────────────────────────

describe('GameOver — score display', () => {
  it('shows 100% for a General game (24 shots)', () => {
    renderGameOver('player', 24);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('shows 96% for an Admiral game (25 shots)', () => {
    renderGameOver('player', 25);
    expect(screen.getByText('96%')).toBeDefined();
  });

  it('shows 92% for 26 shots on easy', () => {
    renderGameOver('player', 26);
    expect(screen.getByText('92%')).toBeDefined();
  });

  it('shows 80% for a Captain game (30 shots)', () => {
    renderGameOver('player', 30);
    expect(screen.getByText('80%')).toBeDefined();
  });

  it('shows 48% for a Sergeant game (50 shots)', () => {
    renderGameOver('player', 50);
    expect(screen.getByText('48%')).toBeDefined();
  });

  it('shows 34% for a Private game (70 shots)', () => {
    renderGameOver('player', 70);
    expect(screen.getByText('34%')).toBeDefined();
  });

  it('does not show efficiency section for defeat', () => {
    renderGameOver('opponent', 50);
    expect(screen.queryByText('EFFICIENCY')).toBeNull();
  });
});

// ─── Difficulty-specific scoring ─────────────────────────────────────────────

describe('GameOver — difficulty-specific scoring', () => {
  it('30 shots on easy → Captain (score 80)', () => {
    const { container } = renderGameOver('player', 30, { difficulty: 'easy' });
    expect(rankName(container)).toBe('CAPTAIN');
  });

  it('30 shots on medium → Admiral (score 92) — multiplier lifts rank', () => {
    const { container } = renderGameOver('player', 30, { difficulty: 'medium' });
    expect(rankName(container)).toBe('ADMIRAL');
  });

  it('40 shots on easy → Sergeant (score 60)', () => {
    const { container } = renderGameOver('player', 40, { difficulty: 'easy' });
    expect(rankName(container)).toBe('SERGEANT');
  });

  it('40 shots on sweaty → Admiral (score 90) — harder difficulty rewards same performance more', () => {
    const { container } = renderGameOver('player', 40, { difficulty: 'sweaty' });
    expect(rankName(container)).toBe('ADMIRAL');
  });

  it('same shot count shows higher score on harder difficulty', () => {
    // 30 shots: easy → 80%, medium → 92%
    const { unmount, container: c1 } = renderGameOver('player', 30, { difficulty: 'easy' });
    expect(c1.querySelector('.gameover-perf__score-num')?.textContent).toContain('80');
    unmount();

    const { container: c2 } = renderGameOver('player', 30, { difficulty: 'medium' });
    expect(c2.querySelector('.gameover-perf__score-num')?.textContent).toContain('92');
  });

  it('difficulty=null defaults scoring to easy and still renders rank', () => {
    // null → 'easy' fallback: 25 shots = score 96 = Admiral
    const { container } = renderGameOver('player', 25, { difficulty: null });
    expect(rankName(container)).toBe('ADMIRAL');
    expect(container.querySelector('.gameover-perf__score-num')?.textContent).toContain('96');
  });
});

// ─── Commentary text ──────────────────────────────────────────────────────────

describe('GameOver — commentary text', () => {
  it('FLAWLESS VICTORY — perfect 24-shot game on easy', () => {
    renderGameOver('player', 24, { difficulty: 'easy' });
    expect(screen.getByText(/FLAWLESS VICTORY/)).toBeDefined();
  });

  it('AHEAD OF PROJECTED — 38 shots on sweaty (=par, score 94)', () => {
    renderGameOver('player', 38, { difficulty: 'sweaty' });
    expect(screen.getByText(/AHEAD OF PROJECTED/)).toBeDefined();
  });

  it('HIGHLY EFFICIENT — 39 shots on sweaty (past par, score 92)', () => {
    renderGameOver('player', 39, { difficulty: 'sweaty' });
    expect(screen.getByText(/HIGHLY EFFICIENT/)).toBeDefined();
  });

  it('COMPETENT EXECUTION — 42 shots on sweaty (past par, score 85)', () => {
    renderGameOver('player', 42, { difficulty: 'sweaty' });
    expect(screen.getByText(/COMPETENT EXECUTION/)).toBeDefined();
  });

  it('PROLONGED ENGAGEMENT — 61 shots on easy (past par, score 39)', () => {
    renderGameOver('player', 61, { difficulty: 'easy' });
    expect(screen.getByText(/PROLONGED ENGAGEMENT/)).toBeDefined();
  });

  it('INEFFICIENT OPERATION — 67 shots on easy (past par, score 35)', () => {
    renderGameOver('player', 67, { difficulty: 'easy' });
    expect(screen.getByText(/INEFFICIENT OPERATION/)).toBeDefined();
  });

  it('commentary includes the uppercased difficulty label', () => {
    renderGameOver('player', 61, { difficulty: 'sweaty' });
    expect(screen.getByText(/SWEATY/)).toBeDefined();
  });

  it('does not show commentary when difficulty is null', () => {
    renderGameOver('player', 25, { difficulty: null });
    // Rank IS shown (easy fallback computes a valid score)
    expect(screen.getByText('RANK ACHIEVED')).toBeDefined();
    // None of the commentary branch strings appear
    const branches = ['FLAWLESS', 'AHEAD OF PROJECTED', 'HIGHLY EFFICIENT',
                       'COMPETENT EXECUTION', 'PROLONGED ENGAGEMENT', 'INEFFICIENT OPERATION'];
    branches.forEach(b => expect(screen.queryByText(new RegExp(b))).toBeNull());
  });

  it('does not show commentary for defeat', () => {
    renderGameOver('opponent', 40, { difficulty: 'easy' });
    expect(screen.queryByText(/FLAWLESS/)).toBeNull();
    expect(screen.queryByText(/ENGAGEMENT/)).toBeNull();
  });
});

// ─── Rank scale ───────────────────────────────────────────────────────────────

describe('GameOver — rank scale', () => {
  it('renders all five rank labels in the scale', () => {
    // Scope to the scale container so the active item's duplicate in the badge
    // does not cause a multiple-match error.
    const { container } = renderGameOver('player', 25); // Admiral active
    const scale = container.querySelector('.gameover-rank-scale') as HTMLElement;
    expect(within(scale).getByText('PRIVATE')).toBeDefined();
    expect(within(scale).getByText('SERGEANT')).toBeDefined();
    expect(within(scale).getByText('CAPTAIN')).toBeDefined();
    expect(within(scale).getByText('ADMIRAL')).toBeDefined();
    expect(within(scale).getByText('GENERAL OF THE ARMIES')).toBeDefined();
  });

  it('marks GENERAL as active for a 24-shot game', () => {
    const { container } = renderGameOver('player', 24);
    const active = container.querySelector('.gameover-rank-scale__item--active');
    expect(active?.textContent).toBe('GENERAL OF THE ARMIES');
  });

  it('marks ADMIRAL as active for a 25-shot game', () => {
    const { container } = renderGameOver('player', 25);
    const active = container.querySelector('.gameover-rank-scale__item--active');
    expect(active?.textContent).toBe('ADMIRAL');
  });

  it('marks CAPTAIN as active for a 30-shot game', () => {
    const { container } = renderGameOver('player', 30);
    const active = container.querySelector('.gameover-rank-scale__item--active');
    expect(active?.textContent).toBe('CAPTAIN');
  });

  it('marks SERGEANT as active for a 50-shot game', () => {
    const { container } = renderGameOver('player', 50);
    const active = container.querySelector('.gameover-rank-scale__item--active');
    expect(active?.textContent).toBe('SERGEANT');
  });

  it('marks PRIVATE as active for a 70-shot game', () => {
    const { container } = renderGameOver('player', 70);
    const active = container.querySelector('.gameover-rank-scale__item--active');
    expect(active?.textContent).toBe('PRIVATE');
  });

  it('exactly one item is active at a time', () => {
    const { container } = renderGameOver('player', 30);
    const actives = container.querySelectorAll('.gameover-rank-scale__item--active');
    expect(actives).toHaveLength(1);
  });

  it('does not render the rank scale for defeat', () => {
    const { container } = renderGameOver('opponent', 50);
    expect(container.querySelector('.gameover-rank-scale')).toBeNull();
  });

  it('non-active items do not carry the active modifier class', () => {
    const { container } = renderGameOver('player', 30); // Captain active → 4 inactive
    const items = container.querySelectorAll('.gameover-rank-scale__item');
    const inactive = Array.from(items).filter(el => !el.className.includes('--active'));
    expect(inactive).toHaveLength(4);
  });
});

// ─── Buttons ──────────────────────────────────────────────────────────────────

describe('GameOver — buttons', () => {
  it('renders the NEW BATTLE button for victory', () => {
    renderGameOver('player', 25);
    expect(screen.getByText('⟳ NEW BATTLE')).toBeDefined();
  });

  it('renders the NEW BATTLE button for defeat', () => {
    renderGameOver('opponent', 40);
    expect(screen.getByText('⟳ NEW BATTLE')).toBeDefined();
  });

  it('calls onRestart when NEW BATTLE is clicked', () => {
    const onRestart = jest.fn();
    renderGameOver('player', 25, { onRestart });
    screen.getByText('⟳ NEW BATTLE').click();
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('renders the close button when onViewBoard is provided', () => {
    renderGameOver('player', 25, { onViewBoard: () => {} });
    expect(screen.getByLabelText('Close and view board')).toBeDefined();
  });

  it('does not render the close button when onViewBoard is omitted', () => {
    renderGameOver('player', 25);
    expect(screen.queryByLabelText('Close and view board')).toBeNull();
  });

  it('calls onViewBoard when close button is clicked', () => {
    const onViewBoard = jest.fn();
    renderGameOver('player', 25, { onViewBoard });
    screen.getByLabelText('Close and view board').click();
    expect(onViewBoard).toHaveBeenCalledTimes(1);
  });
});

// ─── Session stats panel ──────────────────────────────────────────────────────

describe('GameOver — session stats panel visibility', () => {
  it('does not render session stats when no games have been played', () => {
    renderGameOver('player', 25);
    expect(screen.queryByText('SESSION RECORD')).toBeNull();
  });

  it('renders SESSION RECORD heading after at least one game', () => {
    const stats = { ...initialSessionStats(), gamesPlayed: 1, wins: 1, losses: 0 };
    renderGameOver('player', 25, { sessionStats: stats });
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });

  it('renders session stats on the defeat screen too', () => {
    const stats = { ...initialSessionStats(), gamesPlayed: 1, wins: 0, losses: 1 };
    renderGameOver('opponent', 40, { sessionStats: stats });
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });
});

describe('GameOver — session stats values', () => {
  function makeStats(overrides: Partial<SessionStats>): SessionStats {
    return { ...initialSessionStats(), ...overrides };
  }

  it('shows correct ENGAGEMENTS count', () => {
    const stats = makeStats({ gamesPlayed: 5, wins: 3, losses: 2 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('ENGAGEMENTS').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('5')).toBeDefined();
  });

  it('shows correct VICTORIES count', () => {
    const stats = makeStats({ gamesPlayed: 5, wins: 3, losses: 2 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('VICTORIES').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('3')).toBeDefined();
  });

  it('shows correct DEFEATS count', () => {
    const stats = makeStats({ gamesPlayed: 5, wins: 3, losses: 2 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('DEFEATS').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('2')).toBeDefined();
  });

  it('shows WIN RATE percentage', () => {
    // 2 wins / 4 games = 50%
    const stats = makeStats({ gamesPlayed: 4, wins: 2, losses: 2 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('WIN RATE').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('50%')).toBeDefined();
  });

  it('shows AVG SHOTS rounded to nearest integer', () => {
    const stats = makeStats({ gamesPlayed: 2, wins: 1, losses: 1, totalShots: 70 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('AVG SHOTS').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('35')).toBeDefined();
  });

  it('shows BEST SCORE percentage', () => {
    const stats = makeStats({ gamesPlayed: 1, wins: 1, losses: 0, bestScore: 96 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('BEST SCORE').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('96%')).toBeDefined();
  });

  it('shows em-dash for BEST SCORE when no victories recorded', () => {
    const stats = makeStats({ gamesPlayed: 1, wins: 0, losses: 1, bestScore: null });
    renderGameOver('opponent', 40, { sessionStats: stats });
    const cell = screen.getByText('BEST SCORE').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('—')).toBeDefined();
  });

  it('shows current win STREAK', () => {
    const stats = makeStats({ gamesPlayed: 3, wins: 3, losses: 0, winStreak: 3, bestWinStreak: 3 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('STREAK').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('3')).toBeDefined();
  });

  it('shows BEST STREAK separately from current streak', () => {
    // 3 wins, then 1 loss, then 1 win → winStreak=1, bestWinStreak=3
    const stats = makeStats({ gamesPlayed: 5, wins: 4, losses: 1, winStreak: 1, bestWinStreak: 3 });
    renderGameOver('player', 25, { sessionStats: stats });
    const cell = screen.getByText('BEST STREAK').closest('.gameover-stats__cell') as HTMLElement;
    expect(within(cell).getByText('3')).toBeDefined();
  });
});