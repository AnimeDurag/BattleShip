/**
 * PvPGameOver component tests
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import PvPGameOver from '../components/PvPGameOver';

function renderGameOver(overrides: Partial<Parameters<typeof PvPGameOver>[0]> = {}) {
  const props = {
    winner:    1 as 1 | 2,
    p1Shots:   20,
    p2Shots:   25,
    p1Hits:    10,
    p2Hits:    12,
    onRestart: jest.fn(),
    ...overrides,
  };
  return render(<PvPGameOver {...props} />);
}

// ─── Rendered content ─────────────────────────────────────────────────────────

describe('PvPGameOver — rendered content', () => {
  it('displays PLAYER 1 WINS when winner is 1', () => {
    renderGameOver({ winner: 1 });
    expect(screen.getByText('PLAYER 1 WINS')).toBeDefined();
  });

  it('displays PLAYER 2 WINS when winner is 2', () => {
    renderGameOver({ winner: 2 });
    expect(screen.getByText('PLAYER 2 WINS')).toBeDefined();
  });

  it('displays P1 shots count correctly', () => {
    renderGameOver({ p1Shots: 18 });
    const rows = screen.getAllByRole('row');
    const shotsRow = rows.find(r => r.textContent?.includes('SHOTS FIRED'));
    expect(shotsRow?.textContent).toContain('18');
  });

  it('displays P2 shots count correctly', () => {
    renderGameOver({ p2Shots: 30 });
    const rows = screen.getAllByRole('row');
    const shotsRow = rows.find(r => r.textContent?.includes('SHOTS FIRED'));
    expect(shotsRow?.textContent).toContain('30');
  });

  it('displays P1 accuracy as floor(hits/shots*100)%', () => {
    // 10 hits / 20 shots = 50%
    renderGameOver({ p1Shots: 20, p1Hits: 10 });
    const rows = screen.getAllByRole('row');
    const accRow = rows.find(r => r.textContent?.includes('ACCURACY'));
    expect(accRow?.textContent).toContain('50%');
  });

  it('displays P2 accuracy as floor(hits/shots*100)%', () => {
    // 7 hits / 14 shots = 50%
    renderGameOver({ p2Shots: 14, p2Hits: 7 });
    const rows = screen.getAllByRole('row');
    const accRow = rows.find(r => r.textContent?.includes('ACCURACY'));
    expect(accRow?.textContent).toContain('50%');
  });

  it('displays — for accuracy when P1 shots is 0', () => {
    renderGameOver({ p1Shots: 0, p1Hits: 0 });
    const rows = screen.getAllByRole('row');
    const accRow = rows.find(r => r.textContent?.includes('ACCURACY'));
    expect(accRow?.textContent).toContain('—');
  });

  it('displays — for accuracy when P2 shots is 0', () => {
    renderGameOver({ p2Shots: 0, p2Hits: 0 });
    const rows = screen.getAllByRole('row');
    const accRow = rows.find(r => r.textContent?.includes('ACCURACY'));
    expect(accRow?.textContent).toContain('—');
  });

  it('does NOT render any rank label (PRIVATE, SERGEANT, etc.)', () => {
    renderGameOver();
    expect(screen.queryByText(/PRIVATE|SERGEANT|LIEUTENANT|CAPTAIN|ADMIRAL/i)).toBeNull();
  });

  it('does NOT render any percentage efficiency score', () => {
    renderGameOver();
    // Game over does not show a score% efficiency banner like solo mode
    expect(screen.queryByText(/EFFICIENCY/i)).toBeNull();
  });

  it('renders the ⟳ NEW BATTLE button', () => {
    renderGameOver();
    expect(screen.getByText('⟳ NEW BATTLE')).toBeDefined();
  });

  it('clicking NEW BATTLE calls onRestart', () => {
    const onRestart = jest.fn();
    renderGameOver({ onRestart });
    fireEvent.click(screen.getByText('⟳ NEW BATTLE'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
