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
import Cell from '../components/Cell';

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