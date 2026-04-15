interface AudioControlsProps {
  muted:            boolean;
  musicVolume:      number;   // 0–100
  effectsVolume:    number;   // 0–100
  onToggleMute:     () => void;
  onMusicVolume:    (v: number) => void;
  onEffectsVolume:  (v: number) => void;
}

export default function AudioControls({
  muted,
  musicVolume,
  effectsVolume,
  onToggleMute,
  onMusicVolume,
  onEffectsVolume,
}: AudioControlsProps) {
  return (
    <div className={`audio-controls${muted ? ' audio-controls--muted' : ''}`}>
      <button
        className="audio-controls__mute"
        onClick={onToggleMute}
        aria-label="Toggle mute"
        aria-pressed={muted}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <span className="audio-controls__label">MUSIC</span>
      <input
        type="range"
        className="audio-controls__slider"
        min={0}
        max={100}
        step={1}
        value={musicVolume}
        aria-label="Music volume"
        onChange={e => onMusicVolume(Number(e.target.value))}
      />

      <span className="audio-controls__label">EFFECTS</span>
      <input
        type="range"
        className="audio-controls__slider"
        min={0}
        max={100}
        step={1}
        value={effectsVolume}
        aria-label="Effects volume"
        onChange={e => onEffectsVolume(Number(e.target.value))}
      />
    </div>
  );
}
