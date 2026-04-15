/**
 * AudioGateScreen component tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioGateScreen from '../components/AudioGateScreen';

describe('AudioGateScreen — rendering', () => {
  it('renders the CLICK ANYWHERE TO ENABLE AUDIO message', () => {
    render(<AudioGateScreen onUnlock={jest.fn()} />);
    expect(screen.getByText('CLICK ANYWHERE TO ENABLE AUDIO')).toBeDefined();
  });

  it('renders the BATTLESHIP logo (SHIP span)', () => {
    render(<AudioGateScreen onUnlock={jest.fn()} />);
    expect(screen.getByText('SHIP')).toBeDefined();
  });

  it('renders the "And begin your mission" subtext', () => {
    render(<AudioGateScreen onUnlock={jest.fn()} />);
    expect(screen.getByText('And begin your mission')).toBeDefined();
  });

  it('renders a pulsing prompt element', () => {
    const { container } = render(<AudioGateScreen onUnlock={jest.fn()} />);
    const prompt = container.querySelector('.audio-gate__prompt');
    expect(prompt).not.toBeNull();
  });
});

describe('AudioGateScreen — interaction', () => {
  it('clicking the root div calls onUnlock once', () => {
    const onUnlock = jest.fn();
    const { container } = render(<AudioGateScreen onUnlock={onUnlock} />);
    fireEvent.click(container.firstChild as Element);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('onUnlock is NOT called before any click', () => {
    const onUnlock = jest.fn();
    render(<AudioGateScreen onUnlock={onUnlock} />);
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
