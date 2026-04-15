/**
 * Web Audio API synthesis functions — all sound effects for Battleship.
 *
 * Each function accepts an AudioContext and a gainLevel (0.0–1.0) and
 * returns void. All are fire-and-forget: no references are stored.
 */

export type SoundEffect =
  | 'hit' | 'miss' | 'sunk'
  | 'shipPlace' | 'shipClear' | 'randomize'
  | 'uiClick'
  | 'handoffAdvance'
  | 'aiThinking' | 'aiFires';

// ── hit — explosion (350ms) ───────────────────────────────────────────────────

export function playHit(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;
  const duration = 0.35;

  // Sub-bass punch — the core thump of the detonation
  const punch = ctx.createOscillator();
  punch.type = 'sine';
  punch.frequency.setValueAtTime(80, now);
  punch.frequency.exponentialRampToValueAtTime(30, now + 0.15);

  const punchGain = ctx.createGain();
  punchGain.gain.setValueAtTime(0, now);
  punchGain.gain.linearRampToValueAtTime(gain * 0.9, now + 0.004);
  punchGain.gain.linearRampToValueAtTime(0, now + 0.2);

  punch.connect(punchGain);
  punchGain.connect(ctx.destination);
  punch.start(now);
  punch.stop(now + 0.25);

  // Broadband noise burst — explosion body
  const noiseSize = Math.ceil(ctx.sampleRate * duration);
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) noiseData[i] = Math.random() * 2 - 1;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(3000, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(200, now + duration);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(gain * 0.8, now + 0.005);
  noiseGain.gain.linearRampToValueAtTime(0, now + duration);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);

  // High-frequency crack at the moment of impact
  const crackSize = Math.ceil(ctx.sampleRate * 0.06);
  const crackBuf = ctx.createBuffer(1, crackSize, ctx.sampleRate);
  const crackData = crackBuf.getChannelData(0);
  for (let i = 0; i < crackSize; i++) crackData[i] = Math.random() * 2 - 1;

  const crackSource = ctx.createBufferSource();
  crackSource.buffer = crackBuf;

  const crackFilter = ctx.createBiquadFilter();
  crackFilter.type = 'highpass';
  crackFilter.frequency.setValueAtTime(4000, now);

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0, now);
  crackGain.gain.linearRampToValueAtTime(gain * 0.4, now + 0.003);
  crackGain.gain.linearRampToValueAtTime(0, now + 0.06);

  crackSource.connect(crackFilter);
  crackFilter.connect(crackGain);
  crackGain.connect(ctx.destination);
  crackSource.start(now);
}

// ── miss — water splash (350ms) ───────────────────────────────────────────────

export function playMiss(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;
  const duration = 0.35;

  // Main splash body — broadband noise swept from bright to dark as water settles
  const bufSize = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(280, now + 0.09);
  filter.frequency.exponentialRampToValueAtTime(100, now + duration);
  filter.Q.setValueAtTime(0.8, now);

  const splashGain = ctx.createGain();
  splashGain.gain.setValueAtTime(0, now);
  splashGain.gain.linearRampToValueAtTime(gain * 0.8, now + 0.008);
  splashGain.gain.linearRampToValueAtTime(gain * 0.4, now + 0.1);
  splashGain.gain.linearRampToValueAtTime(0, now + duration);

  source.connect(filter);
  filter.connect(splashGain);
  splashGain.connect(ctx.destination);
  source.start(now);

  // Short high-frequency spray burst at moment of impact
  const spraySize = Math.ceil(ctx.sampleRate * 0.08);
  const sprayBuf = ctx.createBuffer(1, spraySize, ctx.sampleRate);
  const sprayData = sprayBuf.getChannelData(0);
  for (let i = 0; i < spraySize; i++) sprayData[i] = Math.random() * 2 - 1;

  const spraySource = ctx.createBufferSource();
  spraySource.buffer = sprayBuf;

  const sprayFilter = ctx.createBiquadFilter();
  sprayFilter.type = 'highpass';
  sprayFilter.frequency.setValueAtTime(3500, now);

  const sprayGain = ctx.createGain();
  sprayGain.gain.setValueAtTime(0, now);
  sprayGain.gain.linearRampToValueAtTime(gain * 0.3, now + 0.005);
  sprayGain.gain.linearRampToValueAtTime(0, now + 0.08);

  spraySource.connect(sprayFilter);
  sprayFilter.connect(sprayGain);
  sprayGain.connect(ctx.destination);
  spraySource.start(now);
}

// ── sunk — bubbles rising from underwater (750ms) ────────────────────────────

export function playSunk(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;
  const duration = 0.75;

  // Noise through a bandpass filter — gives the muffled underwater character
  const noiseSize = Math.ceil(ctx.sampleRate * duration);
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) noiseData[i] = Math.random() * 2 - 1;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;

  const bubbleFilter = ctx.createBiquadFilter();
  bubbleFilter.type = 'bandpass';
  bubbleFilter.frequency.setValueAtTime(550, now);
  bubbleFilter.frequency.exponentialRampToValueAtTime(140, now + duration);
  bubbleFilter.Q.setValueAtTime(2.5, now);

  // Carrier gain — DC offset that fades out over the duration
  const carrierGain = ctx.createGain();
  carrierGain.gain.setValueAtTime(gain * 0.5, now);
  carrierGain.gain.linearRampToValueAtTime(0, now + duration);

  // LFO drives the bubble pulsing — starts fast (lots of bubbles), slows as ship sinks
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(28, now);
  lfo.frequency.linearRampToValueAtTime(8, now + duration);

  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(gain * 0.5, now);
  lfoGain.gain.linearRampToValueAtTime(0, now + duration);

  noiseSource.connect(bubbleFilter);
  bubbleFilter.connect(carrierGain);
  carrierGain.connect(ctx.destination);
  lfo.connect(lfoGain);
  lfoGain.connect(carrierGain.gain); // AM: LFO modulates carrier volume

  noiseSource.start(now);
  lfo.start(now);
  lfo.stop(now + duration);

  // Deep descending drone — the ship going under
  const sinkOsc = ctx.createOscillator();
  sinkOsc.type = 'sine';
  sinkOsc.frequency.setValueAtTime(65, now);
  sinkOsc.frequency.exponentialRampToValueAtTime(22, now + duration);

  const sinkGain = ctx.createGain();
  sinkGain.gain.setValueAtTime(0, now);
  sinkGain.gain.linearRampToValueAtTime(gain * 0.55, now + 0.04);
  sinkGain.gain.linearRampToValueAtTime(0, now + duration);

  sinkOsc.connect(sinkGain);
  sinkGain.connect(ctx.destination);
  sinkOsc.start(now);
  sinkOsc.stop(now + duration);
}

// ── shipPlace — water sloshing (280ms) ───────────────────────────────────────

export function playShipPlace(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;
  const duration = 0.28;

  // Noise filtered to sound like water being displaced — sweeps from bright to dark
  const bufSize = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(120, now + duration);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(gain * 0.6, now + 0.015);
  noiseGain.gain.linearRampToValueAtTime(gain * 0.25, now + 0.1);
  noiseGain.gain.linearRampToValueAtTime(0, now + duration);

  noiseSource.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);

  // Soft low thud underneath for the weight of the hull
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(80, now);
  thud.frequency.exponentialRampToValueAtTime(38, now + 0.16);

  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0, now);
  thudGain.gain.linearRampToValueAtTime(gain * 0.4, now + 0.01);
  thudGain.gain.linearRampToValueAtTime(0, now + 0.18);

  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(now);
  thud.stop(now + 0.2);
}

// ── shipClear — eraser scrub (180ms) ─────────────────────────────────────────

export function playShipClear(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;

  // Three short bandpass noise bursts — simulate a quick back-and-forth scrub
  for (let i = 0; i < 3; i++) {
    const offset = i * 0.052;
    const burstSize = Math.ceil(ctx.sampleRate * 0.042);
    const burstBuf = ctx.createBuffer(1, burstSize, ctx.sampleRate);
    const burstData = burstBuf.getChannelData(0);
    for (let j = 0; j < burstSize; j++) burstData[j] = Math.random() * 2 - 1;

    const burstSource = ctx.createBufferSource();
    burstSource.buffer = burstBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100 - i * 120, now + offset);
    filter.Q.setValueAtTime(1.8, now + offset);

    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0, now + offset);
    burstGain.gain.linearRampToValueAtTime(gain * 0.45, now + offset + 0.006);
    burstGain.gain.linearRampToValueAtTime(0, now + offset + 0.042);

    burstSource.connect(filter);
    filter.connect(burstGain);
    burstGain.connect(ctx.destination);
    burstSource.start(now + offset);
  }
}

// ── randomize — ascending sweep (150ms) ──────────────────────────────────────

export function playRandomize(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(600, now + 0.13);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain * 0.6, now + 0.005);
  gainNode.gain.setValueAtTime(gain * 0.6, now + 0.105);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

// ── uiClick — soft tap (50ms) ────────────────────────────────────────────────

export function playUiClick(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;

  // Sine wave at low-mid frequency — smooth, no harsh square harmonics
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.linearRampToValueAtTime(260, now + 0.05);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gain * 0.28, now + 0.005); // noticeably quieter
  gainNode.gain.linearRampToValueAtTime(0, now + 0.05);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

// ── handoffAdvance — military blip (100ms) ───────────────────────────────────

export function playHandoffAdvance(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;

  // First tone: 440Hz for 50ms
  const osc1 = ctx.createOscillator();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(440, now);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(gain * 0.5, now);
  gain1.gain.setValueAtTime(0, now + 0.05);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.05);

  // Second tone: 550Hz for 50ms
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(550, now + 0.05);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(gain * 0.5, now + 0.05);
  gain2.gain.setValueAtTime(0, now + 0.1);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.05);
  osc2.stop(now + 0.1);
}

// ── aiThinking — radar ping (200ms, quiet) ───────────────────────────────────

export function playAiThinking(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;
  const maxGain = 0.3 * gain; // intentionally quiet

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(maxGain, now + 0.005);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.2);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
}

// ── aiFires — missile launch boom (500ms) ────────────────────────────────────

export function playAiFires(ctx: AudioContext, gain: number): void {
  if (gain <= 0) return;
  const now = ctx.currentTime;
  const duration = 0.5;

  // Deep sub-bass boom — the concussive thump of a launch
  const boom = ctx.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(55, now);
  boom.frequency.exponentialRampToValueAtTime(22, now + duration);

  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0, now);
  boomGain.gain.linearRampToValueAtTime(gain * 0.9, now + 0.005);
  boomGain.gain.linearRampToValueAtTime(gain * 0.55, now + 0.09);
  boomGain.gain.linearRampToValueAtTime(0, now + duration);

  boom.connect(boomGain);
  boomGain.connect(ctx.destination);
  boom.start(now);
  boom.stop(now + duration);

  // Mid-frequency noise — the pressure wave and debris
  const noiseSize = Math.ceil(ctx.sampleRate * duration);
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) noiseData[i] = Math.random() * 2 - 1;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(700, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(90, now + duration);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(gain * 0.75, now + 0.008);
  noiseGain.gain.linearRampToValueAtTime(0, now + duration);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSource.start(now);

  // Brief initial crack — the ignition transient
  const crackSize = Math.ceil(ctx.sampleRate * 0.05);
  const crackBuf = ctx.createBuffer(1, crackSize, ctx.sampleRate);
  const crackData = crackBuf.getChannelData(0);
  for (let i = 0; i < crackSize; i++) crackData[i] = Math.random() * 2 - 1;

  const crackSource = ctx.createBufferSource();
  crackSource.buffer = crackBuf;

  const crackFilter = ctx.createBiquadFilter();
  crackFilter.type = 'highpass';
  crackFilter.frequency.setValueAtTime(3000, now);

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0, now);
  crackGain.gain.linearRampToValueAtTime(gain * 0.5, now + 0.003);
  crackGain.gain.linearRampToValueAtTime(0, now + 0.05);

  crackSource.connect(crackFilter);
  crackFilter.connect(crackGain);
  crackGain.connect(ctx.destination);
  crackSource.start(now);
}

// ── Dispatch map ─────────────────────────────────────────────────────────────

export const playEffectFn: Record<SoundEffect, (ctx: AudioContext, gain: number) => void> = {
  hit:            playHit,
  miss:           playMiss,
  sunk:           playSunk,
  shipPlace:      playShipPlace,
  shipClear:      playShipClear,
  randomize:      playRandomize,
  uiClick:        playUiClick,
  handoffAdvance: playHandoffAdvance,
  aiThinking:     playAiThinking,
  aiFires:        playAiFires,
};
