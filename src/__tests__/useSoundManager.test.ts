/**
 * useSoundManager hook tests
 *
 * jsdom does not implement Web Audio API, so AudioContext is mocked entirely.
 * HTMLAudioElement is also mocked to control play/pause/volume.
 */

import { renderHook, act } from '@testing-library/react';
import { useSoundManager } from '../hooks/useSoundManager';

// ── Mock HTMLAudioElement ──────────────────────────────────────────────────────

function makeMockAudio() {
  return {
    play:        jest.fn().mockResolvedValue(undefined),
    pause:       jest.fn(),
    volume:      0,
    currentTime: 0,
    loop:        false,
    onended:     null as (() => void) | null,
  };
}

let lastAudioInstance: ReturnType<typeof makeMockAudio> | null = null;

beforeAll(() => {
  global.Audio = jest.fn().mockImplementation(() => {
    lastAudioInstance = makeMockAudio();
    return lastAudioInstance;
  }) as unknown as typeof Audio;
});

// ── Mock AudioContext ─────────────────────────────────────────────────────────

const mockOscillatorNode = {
  type:      'sine' as OscillatorType,
  frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
  connect:   jest.fn(),
  start:     jest.fn(),
  stop:      jest.fn(),
};

const mockGainNode = {
  gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
  connect: jest.fn(),
};

const mockBiquadFilter = {
  type:      'lowpass' as BiquadFilterType,
  frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
  Q:         { setValueAtTime: jest.fn() },
  connect:   jest.fn(),
};

const mockBufferSource = {
  buffer:  null as AudioBuffer | null,
  connect: jest.fn(),
  start:   jest.fn(),
  stop:    jest.fn(),
};

const mockAudioBuffer = { getChannelData: jest.fn().mockReturnValue(new Float32Array(100)) };

const mockCtx = {
  resume:              jest.fn(),
  currentTime:         0,
  sampleRate:          44100,
  destination:         {},
  createOscillator:    jest.fn().mockReturnValue(mockOscillatorNode),
  createGain:          jest.fn().mockReturnValue(mockGainNode),
  createBiquadFilter:  jest.fn().mockReturnValue(mockBiquadFilter),
  createBufferSource:  jest.fn().mockReturnValue(mockBufferSource),
  createBuffer:        jest.fn().mockReturnValue(mockAudioBuffer),
};

beforeAll(() => {
  global.AudioContext = jest.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;
});

// ── localStorage helpers ──────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  lastAudioInstance = null;
});

// ── localStorage — initial reads ──────────────────────────────────────────────

describe('useSoundManager — localStorage initial reads', () => {
  it('defaults: muted=false, musicVolume=80, effectsVolume=80, audioUnlocked=false', () => {
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.muted).toBe(false);
    expect(result.current.musicVolume).toBe(80);
    expect(result.current.effectsVolume).toBe(80);
    expect(result.current.audioUnlocked).toBe(false);
  });

  it('reads muted=true from localStorage', () => {
    localStorage.setItem('battleship-muted', 'true');
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.muted).toBe(true);
  });

  it('reads musicVolume from localStorage', () => {
    localStorage.setItem('battleship-music-volume', '50');
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.musicVolume).toBe(50);
  });

  it('reads effectsVolume from localStorage', () => {
    localStorage.setItem('battleship-effects-volume', '30');
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.effectsVolume).toBe(30);
  });

  it('audioUnlocked always starts false, even when localStorage flag is set (gate-skip is handled by App.tsx routing, not by this hook)', () => {
    localStorage.setItem('battleship-audio-unlocked', 'true');
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.audioUnlocked).toBe(false);
  });
});

// ── localStorage — persistence on change ──────────────────────────────────────

describe('useSoundManager — localStorage persistence', () => {
  it('toggleMute writes battleship-muted', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.toggleMute(); });
    expect(localStorage.getItem('battleship-muted')).toBe('true');
  });

  it('setMusicVolume(50) writes battleship-music-volume = "50"', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.setMusicVolume(50); });
    expect(localStorage.getItem('battleship-music-volume')).toBe('50');
  });

  it('setEffectsVolume(30) writes battleship-effects-volume = "30"', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.setEffectsVolume(30); });
    expect(localStorage.getItem('battleship-effects-volume')).toBe('30');
  });

  it('unlockAudio writes battleship-audio-unlocked = "true"', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.unlockAudio(); });
    expect(localStorage.getItem('battleship-audio-unlocked')).toBe('true');
  });
});

// ── State transitions ─────────────────────────────────────────────────────────

describe('useSoundManager — state', () => {
  it('muted starts false; toggleMute sets true; again sets false', () => {
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.muted).toBe(false);
    act(() => { result.current.toggleMute(); });
    expect(result.current.muted).toBe(true);
    act(() => { result.current.toggleMute(); });
    expect(result.current.muted).toBe(false);
  });

  it('setMusicVolume(-10) clamps to 0', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.setMusicVolume(-10); });
    expect(result.current.musicVolume).toBe(0);
  });

  it('setMusicVolume(150) clamps to 100', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.setMusicVolume(150); });
    expect(result.current.musicVolume).toBe(100);
  });

  it('audioUnlocked starts false; unlockAudio sets it true', () => {
    const { result } = renderHook(() => useSoundManager());
    expect(result.current.audioUnlocked).toBe(false);
    act(() => { result.current.unlockAudio(); });
    expect(result.current.audioUnlocked).toBe(true);
  });
});

// ── Effects ───────────────────────────────────────────────────────────────────

describe('useSoundManager — playEffect', () => {
  it('does not call AudioContext when audioUnlocked=false', () => {
    const { result } = renderHook(() => useSoundManager());
    // audioUnlocked defaults to false
    act(() => { result.current.playEffect('hit'); });
    expect(global.AudioContext).not.toHaveBeenCalled();
  });

  it('does not call AudioContext when muted=true', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.unlockAudio(); });
    act(() => { result.current.toggleMute(); });
    const callsBefore = (global.AudioContext as jest.Mock).mock.calls.length;
    act(() => { result.current.playEffect('hit'); });
    expect((global.AudioContext as jest.Mock).mock.calls.length).toBe(callsBefore);
  });

  it('calls getOrCreateCtx (AudioContext) when audioUnlocked=true and not muted', () => {
    const { result } = renderHook(() => useSoundManager());
    act(() => { result.current.unlockAudio(); });
    act(() => { result.current.playEffect('hit'); });
    // AudioContext should have been constructed (or reused from unlockAudio call)
    expect(global.AudioContext).toHaveBeenCalled();
  });
});
