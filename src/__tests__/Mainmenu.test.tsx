/**
 * MainMenu component tests
 *
 * Covers: mode card rendering, SOLO VS AI difficulty buttons, disabled state of
 * PvP and Online cards, COMING SOON labels, session stats panel visibility and
 * values, onSoloStart callback with correct difficulty argument.
 *
 * Required jest config:  testEnvironment: 'jsdom'
 * Required packages:     @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainMenu from '../components/Mainmenu';
import { initialSessionStats, applyResult } from '../hooks/useSessionStats';
import type { SessionStats, GameResult } from '../hooks/useSessionStats';
import type { Difficulty } from '../models/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function win(shots = 30): GameResult {
  return { winner: 'player', shotCount: shots, difficulty: 'medium' };
}

function loss(shots = 60): GameResult {
  return { winner: 'opponent', shotCount: shots, difficulty: 'medium' };
}

function makeStats(results: GameResult[]): SessionStats {
  return results.reduce(applyResult, initialSessionStats());
}

function renderMenu(
  onSoloStart: (d: Difficulty) => void = jest.fn(),
  sessionStats: SessionStats = initialSessionStats()
) {
  return render(
    <MainMenu onSoloStart={onSoloStart} sessionStats={sessionStats} />
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

describe('MainMenu — header', () => {
  it('renders the BATTLESHIP logo', () => {
    renderMenu();
    expect(screen.getByText('SHIP')).toBeDefined(); // split across logo span
  });
});

// ─── Mode cards ───────────────────────────────────────────────────────────────

describe('MainMenu — mode cards', () => {
  it('renders the SOLO VS AI mode card', () => {
    renderMenu();
    expect(screen.getByText('SOLO VS AI')).toBeDefined();
  });

  it('renders the LOCAL PvP mode card', () => {
    renderMenu();
    expect(screen.getByText('LOCAL PvP')).toBeDefined();
  });

  it('renders the ONLINE mode card', () => {
    renderMenu();
    expect(screen.getByText('ONLINE')).toBeDefined();
  });

  it('renders COMING SOON labels for PvP and Online cards', () => {
    renderMenu();
    const comingSoon = screen.getAllByText('COMING SOON');
    expect(comingSoon).toHaveLength(2);
  });

  it('PvP card has aria-disabled="true"', () => {
    const { container } = renderMenu();
    const cards = container.querySelectorAll('.main-menu__mode-card--disabled');
    const pvpCard = Array.from(cards).find(el => el.textContent?.includes('LOCAL PvP'));
    expect(pvpCard?.getAttribute('aria-disabled')).toBe('true');
  });

  it('Online card has aria-disabled="true"', () => {
    const { container } = renderMenu();
    const cards = container.querySelectorAll('.main-menu__mode-card--disabled');
    const onlineCard = Array.from(cards).find(el => el.textContent?.includes('ONLINE'));
    expect(onlineCard?.getAttribute('aria-disabled')).toBe('true');
  });

  it('SOLO VS AI card does not have the disabled modifier class', () => {
    const { container } = renderMenu();
    const soloCard = container.querySelector('.main-menu__mode-card--active');
    expect(soloCard).not.toBeNull();
    expect(soloCard?.className).not.toContain('disabled');
  });
});

// ─── Difficulty buttons ────────────────────────────────────────────────────────

describe('MainMenu — difficulty buttons', () => {
  it('renders all four difficulty buttons inside the Solo card', () => {
    renderMenu();
    expect(screen.getByText('EASY')).toBeDefined();
    expect(screen.getByText('MEDIUM')).toBeDefined();
    expect(screen.getByText('HARD')).toBeDefined();
    expect(screen.getByText('SWEATY')).toBeDefined();
  });

  it('clicking EASY calls onSoloStart with "easy"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    screen.getByText('EASY').click();
    expect(onSoloStart).toHaveBeenCalledWith('easy');
  });

  it('clicking MEDIUM calls onSoloStart with "medium"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    screen.getByText('MEDIUM').click();
    expect(onSoloStart).toHaveBeenCalledWith('medium');
  });

  it('clicking HARD calls onSoloStart with "hard"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    screen.getByText('HARD').click();
    expect(onSoloStart).toHaveBeenCalledWith('hard');
  });

  it('clicking SWEATY calls onSoloStart with "sweaty"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    screen.getByText('SWEATY').click();
    expect(onSoloStart).toHaveBeenCalledWith('sweaty');
  });

  it('each difficulty button is called exactly once per click', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    screen.getByText('HARD').click();
    expect(onSoloStart).toHaveBeenCalledTimes(1);
  });
});

// ─── Session stats panel visibility ───────────────────────────────────────────

describe('MainMenu — session stats panel visibility', () => {
  it('does not render the session panel when no games have been played', () => {
    renderMenu(jest.fn(), initialSessionStats());
    expect(screen.queryByText('SESSION RECORD')).toBeNull();
  });

  it('renders the session panel after one win', () => {
    renderMenu(jest.fn(), makeStats([win()]));
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });

  it('renders the session panel after one loss', () => {
    renderMenu(jest.fn(), makeStats([loss()]));
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });

  it('renders the session panel after mixed results', () => {
    renderMenu(jest.fn(), makeStats([win(), loss(), win()]));
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });
});

// ─── Session stats values ──────────────────────────────────────────────────────

describe('MainMenu — session stats values', () => {
  it('displays the correct WINS count', () => {
    const stats = makeStats([win(), win(), loss()]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('WINS').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('2')).toBeDefined();
  });

  it('displays the correct LOSSES count', () => {
    const stats = makeStats([win(), loss(), loss()]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('LOSSES').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('2')).toBeDefined();
  });

  it('displays WIN RATE as a percentage', () => {
    // 1 win / 2 games = 50%
    const stats = makeStats([win(), loss()]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('WIN RATE').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('50%')).toBeDefined();
  });

  it('displays BEST SCORE percentage after a win', () => {
    // win(24) on medium → calcScore(24,'medium') = 100
    const stats = makeStats([win(24)]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('BEST SCORE').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('100%')).toBeDefined();
  });

  it('displays — for BEST SCORE when only losses have been recorded', () => {
    const stats = makeStats([loss()]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('BEST SCORE').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('—')).toBeDefined();
  });

  it('displays AVG SHOTS rounded to nearest integer', () => {
    // win(30) + loss(40) = total 70 / 2 games = 35
    const stats = makeStats([win(30), loss(40)]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('AVG SHOTS').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('35')).toBeDefined();
  });

  it('displays STREAK of 0 after a loss breaks the streak', () => {
    const stats = makeStats([win(), win(), loss()]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('STREAK').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('0')).toBeDefined();
  });

  it('displays STREAK of 3 after three consecutive wins', () => {
    const stats = makeStats([win(), win(), win()]);
    renderMenu(jest.fn(), stats);
    const cell = screen.getByText('STREAK').closest('.main-menu__session-cell') as HTMLElement;
    expect(within(cell).getByText('3')).toBeDefined();
  });
});