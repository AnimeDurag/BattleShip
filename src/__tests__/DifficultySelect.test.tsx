/**
 * DifficultySelect component tests
 *
 * Covers heading, all four difficulty buttons with codenames, footer text,
 * aria-describedby wiring, unique description IDs, and onSelect callbacks.
 *
 * Required jest config:   testEnvironment: 'jsdom'
 * Required packages:      @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import DifficultySelect from '../components/DifficultySelect';

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('DifficultySelect — rendering', () => {
  it('renders the SELECT THREAT LEVEL heading', () => {
    render(<DifficultySelect onSelect={() => {}} />);
    expect(screen.getByText('SELECT THREAT LEVEL')).toBeDefined();
  });

  it('renders all four difficulty labels', () => {
    render(<DifficultySelect onSelect={() => {}} />);
    expect(screen.getByText('EASY')).toBeDefined();
    expect(screen.getByText('MEDIUM')).toBeDefined();
    expect(screen.getByText('HARD')).toBeDefined();
    expect(screen.getByText('SWEATY')).toBeDefined();
  });

  it('renders the codename for each difficulty', () => {
    render(<DifficultySelect onSelect={() => {}} />);
    expect(screen.getByText('// ERRATIC')).toBeDefined();
    expect(screen.getByText('// HUNTER')).toBeDefined();
    expect(screen.getByText('// PREDATOR')).toBeDefined();
    expect(screen.getByText('// ORACLE')).toBeDefined();
  });

  it('renders exactly four option buttons', () => {
    render(<DifficultySelect onSelect={() => {}} />);
    expect(screen.getAllByRole('button').length).toBe(4);
  });

  it('renders the footer disclaimer', () => {
    render(<DifficultySelect onSelect={() => {}} />);
    expect(screen.getByText(/DIFFICULTY CANNOT BE CHANGED/)).toBeDefined();
  });

  it('renders the introductory sub-heading', () => {
    render(<DifficultySelect onSelect={() => {}} />);
    expect(screen.getByText(/CHOOSE YOUR ADVERSARY/)).toBeDefined();
  });
});

// ─── ARIA ─────────────────────────────────────────────────────────────────────

describe('DifficultySelect — ARIA', () => {
  it('every button has an aria-describedby attribute', () => {
    const { container } = render(<DifficultySelect onSelect={() => {}} />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      expect(btn.getAttribute('aria-describedby')).not.toBeNull();
    });
  });

  it('every aria-describedby ID resolves to an existing element', () => {
    const { container } = render(<DifficultySelect onSelect={() => {}} />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      const descId = btn.getAttribute('aria-describedby')!;
      expect(container.querySelector(`#${descId}`)).not.toBeNull();
    });
  });

  it('all four description IDs are unique', () => {
    const { container } = render(<DifficultySelect onSelect={() => {}} />);
    const ids = Array.from(container.querySelectorAll('button'))
      .map(btn => btn.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(4);
  });

  it('each description element contains relevant threat text', () => {
    const { container } = render(<DifficultySelect onSelect={() => {}} />);
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      const descId = btn.getAttribute('aria-describedby')!;
      const desc = container.querySelector(`#${descId}`);
      expect(desc?.textContent?.length).toBeGreaterThan(0);
    });
  });
});

// ─── Callbacks ────────────────────────────────────────────────────────────────

describe('DifficultySelect — onSelect callbacks', () => {
  it('calls onSelect with "easy" when EASY is clicked', () => {
    const onSelect = jest.fn();
    render(<DifficultySelect onSelect={onSelect} />);
    fireEvent.click(screen.getByText('EASY'));
    expect(onSelect).toHaveBeenCalledWith('easy');
  });

  it('calls onSelect with "medium" when MEDIUM is clicked', () => {
    const onSelect = jest.fn();
    render(<DifficultySelect onSelect={onSelect} />);
    fireEvent.click(screen.getByText('MEDIUM'));
    expect(onSelect).toHaveBeenCalledWith('medium');
  });

  it('calls onSelect with "hard" when HARD is clicked', () => {
    const onSelect = jest.fn();
    render(<DifficultySelect onSelect={onSelect} />);
    fireEvent.click(screen.getByText('HARD'));
    expect(onSelect).toHaveBeenCalledWith('hard');
  });

  it('calls onSelect with "sweaty" when SWEATY is clicked', () => {
    const onSelect = jest.fn();
    render(<DifficultySelect onSelect={onSelect} />);
    fireEvent.click(screen.getByText('SWEATY'));
    expect(onSelect).toHaveBeenCalledWith('sweaty');
  });

  it('calls onSelect exactly once per click', () => {
    const onSelect = jest.fn();
    render(<DifficultySelect onSelect={onSelect} />);
    fireEvent.click(screen.getByText('HARD'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with the correct value for each button independently', () => {
    const onSelect = jest.fn();
    render(<DifficultySelect onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    // Click all four in sequence and verify order
    buttons.forEach(btn => fireEvent.click(btn));
    expect(onSelect).toHaveBeenNthCalledWith(1, 'easy');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'medium');
    expect(onSelect).toHaveBeenNthCalledWith(3, 'hard');
    expect(onSelect).toHaveBeenNthCalledWith(4, 'sweaty');
  });
});
