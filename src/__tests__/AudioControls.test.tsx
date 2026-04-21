/**
 * AudioControls component tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioControls from '../components/AudioControls';

function renderControls(overrides: Partial<React.ComponentProps<typeof AudioControls>> = {}) {
  const defaults = {
    muted:           false,
    musicVolume:     80,
    effectsVolume:   60,
    onToggleMute:    jest.fn(),
    onMusicVolume:   jest.fn(),
    onEffectsVolume: jest.fn(),
  };
  return render(<AudioControls {...defaults} {...overrides} />);
}

describe('AudioControls — rendering', () => {
  it('renders the mute toggle button', () => {
    renderControls();
    expect(screen.getByRole('button', { name: 'Mute audio' })).toBeDefined();
  });

  it('renders two range inputs', () => {
    const { container } = renderControls();
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(2);
  });

  it('music slider has aria-label="Music volume"', () => {
    renderControls();
    expect(screen.getByRole('slider', { name: 'Music volume' })).toBeDefined();
  });

  it('effects slider has aria-label="Effects volume"', () => {
    renderControls();
    expect(screen.getByRole('slider', { name: 'Effects volume' })).toBeDefined();
  });

  it('both sliders have min=0, max=100, step=1', () => {
    const { container } = renderControls();
    const sliders = container.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      expect(slider.getAttribute('min')).toBe('0');
      expect(slider.getAttribute('max')).toBe('100');
      expect(slider.getAttribute('step')).toBe('1');
    });
  });

  it('music slider value reflects musicVolume prop', () => {
    renderControls({ musicVolume: 42 });
    const slider = screen.getByRole('slider', { name: 'Music volume' }) as HTMLInputElement;
    expect(slider.value).toBe('42');
  });

  it('effects slider value reflects effectsVolume prop', () => {
    renderControls({ effectsVolume: 33 });
    const slider = screen.getByRole('slider', { name: 'Effects volume' }) as HTMLInputElement;
    expect(slider.value).toBe('33');
  });

  it('when muted=true, component has audio-controls--muted class', () => {
    const { container } = renderControls({ muted: true });
    expect(container.firstChild).toHaveClass('audio-controls--muted');
  });

  it('when muted=false, component does not have audio-controls--muted class', () => {
    const { container } = renderControls({ muted: false });
    expect(container.firstChild).not.toHaveClass('audio-controls--muted');
  });

  it('mute button has aria-pressed=true when muted', () => {
    renderControls({ muted: true });
    const btn = screen.getByRole('button', { name: 'Unmute audio' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('mute button has aria-pressed=false when not muted', () => {
    renderControls({ muted: false });
    const btn = screen.getByRole('button', { name: 'Mute audio' });
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('AudioControls — interaction', () => {
  it('clicking the mute toggle calls onToggleMute', () => {
    const onToggleMute = jest.fn();
    renderControls({ onToggleMute });
    fireEvent.click(screen.getByRole('button', { name: 'Mute audio' }));
    expect(onToggleMute).toHaveBeenCalledTimes(1);
  });

  it('changing the music slider calls onMusicVolume with numeric value', () => {
    const onMusicVolume = jest.fn();
    renderControls({ onMusicVolume });
    fireEvent.change(screen.getByRole('slider', { name: 'Music volume' }), { target: { value: '55' } });
    expect(onMusicVolume).toHaveBeenCalledWith(55);
  });

  it('changing the effects slider calls onEffectsVolume with numeric value', () => {
    const onEffectsVolume = jest.fn();
    renderControls({ onEffectsVolume });
    fireEvent.change(screen.getByRole('slider', { name: 'Effects volume' }), { target: { value: '25' } });
    expect(onEffectsVolume).toHaveBeenCalledWith(25);
  });
});

describe('AudioControls — mobile behaviour', () => {
  it('on mobile: renders only the mute icon button initially (no sliders)', () => {
    const { container } = renderControls({ isMobile: true });
    expect(screen.getByRole('button', { name: 'Open audio controls' })).toBeDefined();
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(0);
  });

  it('on mobile: clicking the button shows the popover with both sliders', () => {
    const { container } = renderControls({ isMobile: true });
    fireEvent.click(screen.getByRole('button', { name: 'Open audio controls' }));
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(2);
  });

  it('on mobile: clicking the button again collapses the popover', () => {
    const { container } = renderControls({ isMobile: true });
    const btn = screen.getByRole('button', { name: 'Open audio controls' });
    fireEvent.click(btn);
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(2);
    fireEvent.click(btn);
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(0);
  });

  it('on desktop (isMobile=false): renders original layout with two sliders visible', () => {
    const { container } = renderControls({ isMobile: false });
    const sliders = container.querySelectorAll('input[type="range"]');
    expect(sliders).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Open audio controls' })).toBeNull();
  });
});

describe('AudioControls — accessibility', () => {
  it('mute button label is "Mute audio" when not muted', () => {
    renderControls({ muted: false });
    expect(screen.getByRole('button', { name: 'Mute audio' })).toBeDefined();
  });

  it('mute button label is "Unmute audio" when muted', () => {
    renderControls({ muted: true });
    expect(screen.getByRole('button', { name: 'Unmute audio' })).toBeDefined();
  });

  it('music slider has aria-valuemin=0, aria-valuemax=100, aria-valuenow matching prop', () => {
    renderControls({ musicVolume: 75 });
    const slider = screen.getByRole('slider', { name: 'Music volume' });
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
    expect(slider.getAttribute('aria-valuenow')).toBe('75');
  });

  it('effects slider has aria-valuemin=0, aria-valuemax=100, aria-valuenow matching prop', () => {
    renderControls({ effectsVolume: 40 });
    const slider = screen.getByRole('slider', { name: 'Effects volume' });
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
    expect(slider.getAttribute('aria-valuenow')).toBe('40');
  });
});
