/**
 * MainMenu component tests
 *
 * Covers: logo rendering, mode card rendering, SOLO VS AI expand/collapse toggle,
 * difficulty buttons (accessible after toggle), LOCAL PvP card activation,
 * 3-section stats panel, session stats panel visibility and values,
 * onSoloStart / onPvPStart callbacks.
 *
 * Required jest config:  testEnvironment: 'jsdom'
 * Required packages:     @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainMenu from '../components/Mainmenu';
import {
  initialSessionStats,
  applyResult,
  initialPvPSessionStats,
  applyPvPResult,
} from '../hooks/useSessionStats';
import type { SessionStats, GameResult, PvPSessionStats, PvPGameResult } from '../hooks/useSessionStats';
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

function makePvPStats(results: PvPGameResult[]): PvPSessionStats {
  return results.reduce(applyPvPResult, initialPvPSessionStats());
}

function pvpWin(): PvPGameResult {
  return { winner: 1, p1Shots: 20, p2Shots: 22, p1Hits: 10, p2Hits: 11 };
}

function renderMenu(
  onSoloStart: (d: Difficulty) => void = jest.fn(),
  soloStats: SessionStats = initialSessionStats(),
  pvpStats: PvPSessionStats = initialPvPSessionStats(),
  onPvPStart: () => void = jest.fn(),
) {
  return render(
    <MainMenu
      onSoloStart={onSoloStart}
      onPvPStart={onPvPStart}
      soloStats={soloStats}
      pvpStats={pvpStats}
    />
  );
}

/** Clicks the SOLO VS AI toggle button to open the difficulty drawer. */
function expandSolo() {
  fireEvent.click(screen.getByText('SOLO VS AI').closest('button')!);
}

// ─── Header ───────────────────────────────────────────────────────────────────

describe('MainMenu — header', () => {
  it('renders the BATTLESHIP logo', () => {
    renderMenu();
    expect(screen.getByText('SHIP')).toBeDefined();
  });
});

// ─── Mode cards ───────────────────────────────────────────────────────────────

describe('MainMenu — mode cards', () => {
  it('renders the SOLO VS AI mode card', () => {
    renderMenu();
    expect(screen.getByText('SOLO VS AI')).toBeDefined();
  });

  it('renders the LOCAL PVP mode card', () => {
    renderMenu();
    expect(screen.getByText('LOCAL PVP')).toBeDefined();
  });

  it('renders the ONLINE mode card', () => {
    renderMenu();
    expect(screen.getByText('ONLINE')).toBeDefined();
  });

  it('renders COMING SOON label only for Online card (not PvP)', () => {
    renderMenu();
    const comingSoon = screen.getAllByText('COMING SOON');
    expect(comingSoon).toHaveLength(1);
  });

  it('Online card has aria-disabled="true"', () => {
    const { container } = renderMenu();
    const cards = container.querySelectorAll('.main-menu__mode-block--disabled');
    const onlineCard = Array.from(cards).find(el => el.textContent?.includes('ONLINE'));
    expect(onlineCard?.getAttribute('aria-disabled')).toBe('true');
  });

  it('SOLO VS AI card does not have the disabled modifier class', () => {
    renderMenu();
    const soloBlock = screen.getByText('SOLO VS AI').closest('.main-menu__mode-block');
    expect(soloBlock).not.toBeNull();
    expect(soloBlock?.className).not.toContain('disabled');
  });
});

// ─── Local PvP card activation ────────────────────────────────────────────────

describe('MainMenu — LOCAL PvP card', () => {
  it('LOCAL PvP card does NOT have aria-disabled="true"', () => {
    const { container } = renderMenu();
    const cards = container.querySelectorAll('.main-menu__mode-block--disabled');
    const pvpCard = Array.from(cards).find(el => el.textContent?.includes('LOCAL PVP'));
    expect(pvpCard).toBeUndefined();
  });

  it('LOCAL PvP card does not show COMING SOON label', () => {
    renderMenu();
    // Only ONLINE has COMING SOON
    const comingSoon = screen.getAllByText('COMING SOON');
    expect(comingSoon).toHaveLength(1);
    expect(comingSoon[0].closest('[aria-disabled]')?.textContent).toContain('ONLINE');
  });

  it('clicking START LOCAL PvP button calls onPvPStart', () => {
    const onPvPStart = jest.fn();
    renderMenu(jest.fn(), initialSessionStats(), initialPvPSessionStats(), onPvPStart);
    fireEvent.click(screen.getByText('START LOCAL PvP'));
    expect(onPvPStart).toHaveBeenCalledTimes(1);
  });
});

// ─── Solo vs AI expand/collapse toggle ────────────────────────────────────────

describe('MainMenu — Solo vs AI toggle', () => {
  it('toggle button starts with aria-expanded="false"', () => {
    renderMenu();
    const toggle = screen.getByText('SOLO VS AI').closest('button')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking the toggle sets aria-expanded="true"', () => {
    renderMenu();
    const toggle = screen.getByText('SOLO VS AI').closest('button')!;
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking the toggle twice collapses it back to aria-expanded="false"', () => {
    renderMenu();
    const toggle = screen.getByText('SOLO VS AI').closest('button')!;
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('adds the --expanded modifier class to the mode block when open', () => {
    renderMenu();
    expandSolo();
    const soloBlock = screen.getByText('SOLO VS AI').closest('.main-menu__mode-block');
    expect(soloBlock?.className).toContain('main-menu__mode-block--expanded');
  });

  it('removes the --expanded modifier class when collapsed', () => {
    renderMenu();
    expandSolo();
    expandSolo();
    const soloBlock = screen.getByText('SOLO VS AI').closest('.main-menu__mode-block');
    expect(soloBlock?.className).not.toContain('main-menu__mode-block--expanded');
  });
});

// ─── Difficulty buttons ────────────────────────────────────────────────────────

describe('MainMenu — difficulty buttons', () => {
  it('renders all four difficulty buttons inside the Solo card after expanding', () => {
    renderMenu();
    expandSolo();
    expect(screen.getByText('EASY')).toBeDefined();
    expect(screen.getByText('MEDIUM')).toBeDefined();
    expect(screen.getByText('HARD')).toBeDefined();
    expect(screen.getByText('SWEATY')).toBeDefined();
  });

  it('clicking EASY calls onSoloStart with "easy"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    expandSolo();
    screen.getByText('EASY').click();
    expect(onSoloStart).toHaveBeenCalledWith('easy');
  });

  it('clicking MEDIUM calls onSoloStart with "medium"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    expandSolo();
    screen.getByText('MEDIUM').click();
    expect(onSoloStart).toHaveBeenCalledWith('medium');
  });

  it('clicking HARD calls onSoloStart with "hard"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    expandSolo();
    screen.getByText('HARD').click();
    expect(onSoloStart).toHaveBeenCalledWith('hard');
  });

  it('clicking SWEATY calls onSoloStart with "sweaty"', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    expandSolo();
    screen.getByText('SWEATY').click();
    expect(onSoloStart).toHaveBeenCalledWith('sweaty');
  });

  it('each difficulty button fires onSoloStart exactly once per click', () => {
    const onSoloStart = jest.fn();
    renderMenu(onSoloStart);
    expandSolo();
    screen.getByText('HARD').click();
    expect(onSoloStart).toHaveBeenCalledTimes(1);
  });
});

// ─── Session stats panel visibility ───────────────────────────────────────────

describe('MainMenu — session stats panel visibility', () => {
  it('does not render the session panel when both soloStats and pvpStats have 0 games', () => {
    renderMenu(jest.fn(), initialSessionStats(), initialPvPSessionStats());
    expect(screen.queryByText('SESSION RECORD')).toBeNull();
  });

  it('renders the session panel after one solo win', () => {
    renderMenu(jest.fn(), makeStats([win()]));
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });

  it('renders the session panel after one pvp game', () => {
    renderMenu(jest.fn(), initialSessionStats(), makePvPStats([pvpWin()]));
    expect(screen.getByText('SESSION RECORD')).toBeDefined();
  });

  it('SOLO VS AI section shown when soloStats.gamesPlayed > 0', () => {
    renderMenu(jest.fn(), makeStats([win()]));
    // 'SOLO VS AI' appears in both the mode card and the stats section title
    const sections = screen.getAllByText('SOLO VS AI');
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('PLAYER 1 section shown when pvpStats.gamesPlayed > 0', () => {
    renderMenu(jest.fn(), initialSessionStats(), makePvPStats([pvpWin()]));
    expect(screen.getByText('PLAYER 1')).toBeDefined();
  });

  it('PLAYER 2 section shown when pvpStats.gamesPlayed > 0', () => {
    renderMenu(jest.fn(), initialSessionStats(), makePvPStats([pvpWin()]));
    expect(screen.getByText('PLAYER 2')).toBeDefined();
  });
});

// ─── Solo VS AI section values ────────────────────────────────────────────────

describe('MainMenu — solo stats values', () => {
  it('displays the correct WINS count in SOLO VS AI section', () => {
    const stats = makeStats([win(), win(), loss()]);
    renderMenu(jest.fn(), stats);
    const sections = document.querySelectorAll('.main-menu__session-section');
    const soloSection = Array.from(sections).find(s => s.textContent?.includes('SOLO VS AI'));
    expect(soloSection?.textContent).toContain('2');
  });

  it('displays WIN RATE in SOLO VS AI section', () => {
    const stats = makeStats([win(), loss()]);
    renderMenu(jest.fn(), stats);
    expect(screen.getByText('WIN RATE')).toBeDefined();
    // 50% win rate
    expect(screen.getByText('50%')).toBeDefined();
  });
});

// ─── PvP stats section values ─────────────────────────────────────────────────

describe('MainMenu — PvP stats values', () => {
  it('PLAYER 1 section shows p1Wins', () => {
    const pvpStats = makePvPStats([pvpWin(), pvpWin()]);
    renderMenu(jest.fn(), initialSessionStats(), pvpStats);
    // p1Wins = 2
    const p1Section = document.querySelectorAll('.main-menu__session-section')[0];
    expect(p1Section?.textContent).toContain('2');
  });

  it('shows — placeholders when accuracy data is missing (zero shots)', () => {
    const pvpStats: PvPSessionStats = {
      gamesPlayed: 1, p1Wins: 1, p2Wins: 0,
      p1TotalShots: 0, p2TotalShots: 0,
      p1TotalHits: 0, p2TotalHits: 0,
    };
    renderMenu(jest.fn(), initialSessionStats(), pvpStats);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });
});
