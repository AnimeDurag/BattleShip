/**
 * PvPHandoffScreen component tests
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PvPHandoffScreen from '../components/PvPHandoffScreen';

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('PvPHandoffScreen — rendering', () => {
  it('renders the message text', () => {
    render(<PvPHandoffScreen message="PLAYER 1 SETUP COMPLETE" onAdvance={jest.fn()} onPlayEffect={jest.fn()} />);
    expect(screen.getByText('PLAYER 1 SETUP COMPLETE')).toBeDefined();
  });

  it('renders subMessage when provided', () => {
    render(
      <PvPHandoffScreen
        message="PLAYER 1 SETUP COMPLETE"
        subMessage="PLAYER 2 — PRESS ANY KEY TO BEGIN"
        onAdvance={jest.fn()}
        onPlayEffect={jest.fn()}
      />
    );
    expect(screen.getByText('PLAYER 2 — PRESS ANY KEY TO BEGIN')).toBeDefined();
  });

  it('does not render subMessage when omitted', () => {
    render(<PvPHandoffScreen message="PLAYER 1 SETUP COMPLETE" onAdvance={jest.fn()} onPlayEffect={jest.fn()} />);
    expect(screen.queryByText('PLAYER 2 — PRESS ANY KEY TO BEGIN')).toBeNull();
  });

  it('renders the PRESS ANY KEY TO CONTINUE prompt', () => {
    render(<PvPHandoffScreen message="TEST" onAdvance={jest.fn()} onPlayEffect={jest.fn()} />);
    expect(screen.getByText('PRESS ANY KEY TO CONTINUE')).toBeDefined();
  });
});

// ─── Keypress gate ────────────────────────────────────────────────────────────

describe('PvPHandoffScreen — keypress gate', () => {
  it('fires onAdvance once when a keydown event is triggered', () => {
    const onAdvance = jest.fn();
    render(<PvPHandoffScreen message="TEST" onAdvance={onAdvance} onPlayEffect={jest.fn()} />);
    act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('fires onAdvance multiple times when keydown is triggered multiple times', () => {
    const onAdvance = jest.fn();
    render(<PvPHandoffScreen message="TEST" onAdvance={onAdvance} onPlayEffect={jest.fn()} />);
    act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
    act(() => { fireEvent.keyDown(window, { key: ' ' }); });
    act(() => { fireEvent.keyDown(window, { key: 'a' }); });
    expect(onAdvance).toHaveBeenCalledTimes(3);
  });

  it('does NOT call onAdvance on mouse click', () => {
    const onAdvance = jest.fn();
    const { container } = render(<PvPHandoffScreen message="TEST" onAdvance={onAdvance} onPlayEffect={jest.fn()} />);
    act(() => { fireEvent.click(container.firstChild as Element); });
    expect(onAdvance).not.toHaveBeenCalled();
  });
});

// ─── Unmount cleanup ─────────────────────────────────────────────────────────

describe('PvPHandoffScreen — unmount cleanup', () => {
  it('does not call onAdvance after unmount', () => {
    const onAdvance = jest.fn();
    const { unmount } = render(<PvPHandoffScreen message="TEST" onAdvance={onAdvance} onPlayEffect={jest.fn()} />);
    unmount();
    act(() => { fireEvent.keyDown(window, { key: 'Enter' }); });
    expect(onAdvance).not.toHaveBeenCalled();
  });
});
