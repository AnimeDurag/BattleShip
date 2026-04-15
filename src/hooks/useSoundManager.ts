import { useRef, useState, useEffect, useCallback } from 'react';
import type { SoundEffect } from '../audio/effects';
import { playEffectFn } from '../audio/effects';

import musicMenuSrc    from '../assets/audio/music-menu.mp3';
import musicSetupSrc   from '../assets/audio/music-setup.mp3';
import musicBattleSrc  from '../assets/audio/music-battle.mp3';
import musicVictorySrc from '../assets/audio/music-victory.mp3';
import musicDefeatSrc  from '../assets/audio/music-defeat.mp3';

// ── Track key → source URL ────────────────────────────────────────────────────

const TRACK_SRCS: Record<string, string> = {
  menu:    musicMenuSrc,
  setup:   musicSetupSrc,
  battle:  musicBattleSrc,
  victory: musicVictorySrc,
  defeat:  musicDefeatSrc,
};

// ── Helpers for localStorage ──────────────────────────────────────────────────

function readInt(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const n = parseInt(raw, 10);
  return isNaN(n) ? fallback : n;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSoundManager() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [muted, setMutedState] = useState<boolean>(
    () => localStorage.getItem('battleship-muted') === 'true'
  );
  const [musicVolume, setMusicVolumeState] = useState<number>(
    () => readInt('battleship-music-volume', 80)
  );
  const [effectsVolume, setEffectsVolumeState] = useState<number>(
    () => readInt('battleship-effects-volume', 80)
  );
  // Always start false — localStorage flag only controls gate-skip routing in App.tsx.
  // The hook unlocks on first user interaction regardless of prior visits.
  const [audioUnlocked, setAudioUnlockedState] = useState<boolean>(false);

  // ── Refs for async-safe access (no stale closures) ────────────────────────
  const mutedRef         = useRef(muted);
  const musicVolumeRef   = useRef(musicVolume);
  const effectsVolumeRef = useRef(effectsVolume);
  const audioUnlockedRef = useRef(audioUnlocked);

  useEffect(() => { mutedRef.current = muted; },         [muted]);
  useEffect(() => { musicVolumeRef.current = musicVolume; }, [musicVolume]);
  useEffect(() => { effectsVolumeRef.current = effectsVolume; }, [effectsVolume]);
  useEffect(() => { audioUnlockedRef.current = audioUnlocked; }, [audioUnlocked]);

  // ── Audio infrastructure refs ─────────────────────────────────────────────
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const musicRef          = useRef<Record<string, HTMLAudioElement>>({});
  const currentTrackKeyRef = useRef<string | null>(null);
  const fadeIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── localStorage persistence ──────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('battleship-muted', String(muted));
  }, [muted]);

  useEffect(() => {
    localStorage.setItem('battleship-music-volume', String(musicVolume));
    const key = currentTrackKeyRef.current;
    if (!mutedRef.current && key && musicRef.current[key]) {
      musicRef.current[key].volume = musicVolume / 100;
    }
  }, [musicVolume]);

  useEffect(() => {
    localStorage.setItem('battleship-effects-volume', String(effectsVolume));
  }, [effectsVolume]);

  // ── AudioContext management ───────────────────────────────────────────────

  function getOrCreateCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  // ── Music track management ────────────────────────────────────────────────

  function getTrack(key: string, src: string): HTMLAudioElement {
    if (!musicRef.current[key]) {
      const el = new Audio(src);
      el.loop = key !== 'victory' && key !== 'defeat';
      el.volume = 0;
      musicRef.current[key] = el;
    }
    return musicRef.current[key];
  }

  // ── Fade helpers ──────────────────────────────────────────────────────────

  function cancelFade() {
    if (fadeIntervalRef.current !== null) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }

  function fadeOut(el: HTMLAudioElement, ms = 500): Promise<void> {
    return new Promise(resolve => {
      cancelFade();
      const startVol = el.volume;
      if (startVol === 0) {
        el.pause();
        resolve();
        return;
      }
      const steps = 20;
      const stepMs = ms / steps;
      const dec = startVol / steps;
      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        el.volume = Math.max(0, startVol - dec * step);
        if (step >= steps) {
          cancelFade();
          el.pause();
          resolve();
        }
      }, stepMs);
    });
  }

  function fadeIn(el: HTMLAudioElement, targetVolume: number, ms = 500): Promise<void> {
    return new Promise(resolve => {
      cancelFade();
      el.volume = 0;
      el.play().catch(() => { /* autoplay blocked — audio gate should prevent this */ });
      if (targetVolume <= 0) {
        resolve();
        return;
      }
      const steps = 20;
      const stepMs = ms / steps;
      const inc = targetVolume / steps;
      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        el.volume = Math.min(targetVolume, inc * step);
        if (step >= steps) {
          cancelFade();
          el.volume = targetVolume;
          resolve();
        }
      }, stepMs);
    });
  }

  // ── playTrack ─────────────────────────────────────────────────────────────

  const playTrack = useCallback(async (key: string) => {
    if (currentTrackKeyRef.current === key) return;

    // Fade out current track if any
    const prevKey = currentTrackKeyRef.current;
    if (prevKey && musicRef.current[prevKey]) {
      await fadeOut(musicRef.current[prevKey]);
    }

    // Set key before fade-in so concurrent calls see the new key
    currentTrackKeyRef.current = key;

    const next = getTrack(key, TRACK_SRCS[key]);
    next.currentTime = 0;
    const targetVol = mutedRef.current ? 0 : (musicVolumeRef.current / 100);
    await fadeIn(next, targetVol);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── stopMusic ─────────────────────────────────────────────────────────────

  const stopMusic = useCallback(() => {
    const key = currentTrackKeyRef.current;
    if (key && musicRef.current[key]) {
      fadeOut(musicRef.current[key]);
    }
    currentTrackKeyRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── playEffect ────────────────────────────────────────────────────────────

  const playEffect = useCallback((effect: SoundEffect) => {
    if (!audioUnlockedRef.current || mutedRef.current) return;
    const ctx = getOrCreateCtx();
    const gain = effectsVolumeRef.current / 100;
    playEffectFn[effect](ctx, gain);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── unlockAudio ───────────────────────────────────────────────────────────

  const unlockAudio = useCallback(() => {
    const ctx = getOrCreateCtx();
    ctx.resume();
    // Pre-unlock every HTML Audio element within the user gesture so that
    // subsequent async el.play() calls (from React effects) are allowed by
    // the browser's autoplay policy.
    Object.keys(TRACK_SRCS).forEach(key => {
      const el = getTrack(key, TRACK_SRCS[key]);
      const p = el.play();
      if (p !== undefined) {
        p.then(() => { el.pause(); el.currentTime = 0; }).catch(() => {});
      }
    });
    audioUnlockedRef.current = true;
    setAudioUnlockedState(true);
    localStorage.setItem('battleship-audio-unlocked', 'true');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Return-visitor unlock ─────────────────────────────────────────────────
  // When the audio gate was skipped (localStorage flag set), audioUnlocked is
  // still false until the user's first interaction. Attach a one-time listener
  // so that first click/keydown triggers unlockAudio transparently.
  useEffect(() => {
    if (localStorage.getItem('battleship-audio-unlocked') !== 'true') return;
    if (audioUnlockedRef.current) return;
    function handleFirstInteraction() {
      unlockAudio();
    }
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── toggleMute ────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMutedState(next);
    const key = currentTrackKeyRef.current;
    if (key && musicRef.current[key]) {
      musicRef.current[key].volume = next ? 0 : (musicVolumeRef.current / 100);
    }
  }, []);

  // ── setMusicVolume / setEffectsVolume ─────────────────────────────────────

  const setMusicVolume = useCallback((v: number) => {
    const clamped = clamp(Math.round(v), 0, 100);
    musicVolumeRef.current = clamped;
    setMusicVolumeState(clamped);
  }, []);

  const setEffectsVolume = useCallback((v: number) => {
    const clamped = clamp(Math.round(v), 0, 100);
    effectsVolumeRef.current = clamped;
    setEffectsVolumeState(clamped);
  }, []);

  // ── Return value ──────────────────────────────────────────────────────────

  return {
    muted,
    musicVolume,
    effectsVolume,
    audioUnlocked,
    toggleMute,
    setMusicVolume,
    setEffectsVolume,
    unlockAudio,
    playTrack,
    stopMusic,
    playEffect,
  };
}
