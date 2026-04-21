/**
 * Cell component tests
 *
 * Covers class composition for all cell states, preview overrides,
 * marker rendering, ARIA/role attributes, and event callbacks.
 *
 * Required jest config:   testEnvironment: 'jsdom'
 * Required packages:      @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Cell, { cellAriaLabel } from '../components/Cell';

// ─── Class composition ────────────────────────────────────────────────────────

describe('Cell — class composition', () => {
  it('renders with base class "cell"', () => {
    const { container } = render(<Cell state="empty" isOwn={false} />);
    expect(container.firstChild).toHaveClass('cell');
  });

  it('adds cell--ship only when state=ship AND isOwn=true', () => {
    const { container } = render(<Cell state="ship" isOwn={true} />);
    expect(container.firstChild).toHaveClass('cell--ship');
  });

  it('does not add cell--ship when state=ship AND isOwn=false (enemy ship hidden)', () => {
    const { container } = render(<Cell state="ship" isOwn={false} />);
    expect(container.firstChild).not.toHaveClass('cell--ship');
  });

  it('adds cell--hit for hit state', () => {
    const { container } = render(<Cell state="hit" isOwn={false} />);
    expect(container.firstChild).toHaveClass('cell--hit');
  });

  it('adds cell--miss for miss state', () => {
    const { container } = render(<Cell state="miss" isOwn={false} />);
    expect(container.firstChild).toHaveClass('cell--miss');
  });

  it('adds cell--sunk for sunk state', () => {
    const { container } = render(<Cell state="sunk" isOwn={false} />);
    expect(container.firstChild).toHaveClass('cell--sunk');
  });

  it('adds cell--preview-valid when previewState=valid (overrides state classes)', () => {
    const { container } = render(<Cell state="ship" isOwn={true} previewState="valid" />);
    expect(container.firstChild).toHaveClass('cell--preview-valid');
    expect(container.firstChild).not.toHaveClass('cell--ship');
  });

  it('adds cell--preview-invalid when previewState=invalid (overrides state classes)', () => {
    const { container } = render(<Cell state="empty" isOwn={true} previewState="invalid" />);
    expect(container.firstChild).toHaveClass('cell--preview-invalid');
  });

  it('adds cell--attackable when attackable=true', () => {
    const { container } = render(<Cell state="empty" isOwn={false} attackable />);
    expect(container.firstChild).toHaveClass('cell--attackable');
  });

  it('adds cell--attackable when setupClickable=true', () => {
    const { container } = render(<Cell state="empty" isOwn={true} setupClickable />);
    expect(container.firstChild).toHaveClass('cell--attackable');
  });

  it('adds cell--focused when focused=true', () => {
    const { container } = render(<Cell state="empty" isOwn={false} focused />);
    expect(container.firstChild).toHaveClass('cell--focused');
  });

  it('does not add cell--focused by default', () => {
    const { container } = render(<Cell state="empty" isOwn={false} />);
    expect(container.firstChild).not.toHaveClass('cell--focused');
  });
});

// ─── Markers ──────────────────────────────────────────────────────────────────

describe('Cell — markers', () => {
  it('renders ✕ marker for hit state', () => {
    render(<Cell state="hit" isOwn={false} />);
    expect(screen.getByText('✕')).toBeDefined();
  });

  it('renders ✕ marker for sunk state', () => {
    render(<Cell state="sunk" isOwn={false} />);
    expect(screen.getByText('✕')).toBeDefined();
  });

  it('renders · marker for miss state', () => {
    render(<Cell state="miss" isOwn={false} />);
    expect(screen.getByText('·')).toBeDefined();
  });

  it('renders ■ marker for own ship cell', () => {
    render(<Cell state="ship" isOwn={true} />);
    expect(screen.getByText('■')).toBeDefined();
  });

  it('renders no marker for empty cell', () => {
    const { container } = render(<Cell state="empty" isOwn={false} />);
    expect(container.querySelector('.cell__marker')).toBeNull();
  });

  it('renders no marker for enemy ship cell (ship is hidden)', () => {
    const { container } = render(<Cell state="ship" isOwn={false} />);
    expect(container.querySelector('.cell__marker')).toBeNull();
  });
});

// ─── ARIA and role ────────────────────────────────────────────────────────────

describe('Cell — ARIA and role', () => {
  it('has role=button and aria-label "Attack cell" when attackable', () => {
    render(<Cell state="empty" isOwn={false} attackable />);
    expect(screen.getByRole('button', { name: 'Attack cell' })).toBeDefined();
  });

  it('has role=button and aria-label "Place ship" when setupClickable', () => {
    render(<Cell state="empty" isOwn={true} setupClickable />);
    expect(screen.getByRole('button', { name: 'Place ship' })).toBeDefined();
  });

  it('has no role when neither attackable nor setupClickable', () => {
    const { container } = render(<Cell state="empty" isOwn={false} />);
    expect(container.firstElementChild?.getAttribute('role')).toBeNull();
  });
});

// ─── Coordinate aria-label ────────────────────────────────────────────────────

describe('Cell — coordinate aria-label (cellAriaLabel helper)', () => {
  it('unattacked enemy cell includes coordinate and "fire here"', () => {
    const label = cellAriaLabel('A', 1, 'empty', false);
    expect(label).toBe('A1 — fire here');
  });

  it('hit enemy cell includes coordinate and "hit"', () => {
    const label = cellAriaLabel('B', 3, 'hit', false);
    expect(label).toBe('B3 — hit');
  });

  it('missed enemy cell includes coordinate and "missed"', () => {
    const label = cellAriaLabel('C', 5, 'miss', false);
    expect(label).toBe('C5 — missed');
  });

  it('sunk enemy cell includes coordinate and "sunk"', () => {
    const label = cellAriaLabel('D', 7, 'sunk', false);
    expect(label).toBe('D7 — sunk');
  });

  it('own hit cell describes "your ship was hit here"', () => {
    const label = cellAriaLabel('E', 2, 'hit', true);
    expect(label).toBe('E2 — your ship was hit here');
  });

  it('own miss cell describes "enemy missed here"', () => {
    const label = cellAriaLabel('F', 4, 'miss', true);
    expect(label).toBe('F4 — enemy missed here');
  });

  it('own sunk cell describes "your ship was sunk"', () => {
    const label = cellAriaLabel('G', 6, 'sunk', true);
    expect(label).toBe('G6 — your ship was sunk');
  });

  it('own empty cell returns just the coordinate', () => {
    const label = cellAriaLabel('H', 8, 'empty', true);
    expect(label).toBe('H8');
  });

  it('uses col and row props when provided for aria-label', () => {
    render(<Cell state="empty" isOwn={false} attackable col="A" row={1} />);
    expect(screen.getByRole('button', { name: 'A1 — fire here' })).toBeDefined();
  });

  it('aria-disabled is set on already-attacked cells when ariaDisabled prop is true', () => {
    const { container } = render(<Cell state="hit" isOwn={false} col="B" row={2} ariaDisabled />);
    expect(container.firstElementChild?.getAttribute('aria-disabled')).toBe('true');
  });

  it('aria-disabled is absent when ariaDisabled is not set', () => {
    const { container } = render(<Cell state="empty" isOwn={false} attackable col="C" row={3} />);
    expect(container.firstElementChild?.getAttribute('aria-disabled')).toBeNull();
  });
});

// ─── Event callbacks ──────────────────────────────────────────────────────────

describe('Cell — event callbacks', () => {
  it('fires onClick when attackable cell is clicked', () => {
    const onClick = jest.fn();
    render(<Cell state="empty" isOwn={false} attackable onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClick when setupClickable cell is clicked', () => {
    const onClick = jest.fn();
    render(<Cell state="empty" isOwn={true} setupClickable onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onClick when cell is not interactive', () => {
    const onClick = jest.fn();
    const { container } = render(<Cell state="empty" isOwn={false} onClick={onClick} />);
    fireEvent.click(container.firstChild as Element);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires onMouseEnter on mouse enter', () => {
    const onMouseEnter = jest.fn();
    const { container } = render(<Cell state="empty" isOwn={false} onMouseEnter={onMouseEnter} />);
    fireEvent.mouseEnter(container.firstChild as Element);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });

  it('fires onMouseLeave on mouse leave', () => {
    const onMouseLeave = jest.fn();
    const { container } = render(<Cell state="empty" isOwn={false} onMouseLeave={onMouseLeave} />);
    fireEvent.mouseLeave(container.firstChild as Element);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });
});