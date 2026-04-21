import { useState } from 'react';

interface AudioControlsProps {
  muted:            boolean;
  musicVolume:      number;   // 0–100
  effectsVolume:    number;   // 0–100
  onToggleMute:     () => void;
  onMusicVolume:    (v: number) => void;
  onEffectsVolume:  (v: number) => void;
  isMobile?:        boolean;
}

export default function AudioControls({
  muted,
  musicVolume,
  effectsVolume,
  onToggleMute,
  onMusicVolume,
  onEffectsVolume,
  isMobile = false,
}: AudioControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sliders = (
    <>
      <button
        className="audio-controls__mute"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
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
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={musicVolume}
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
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={effectsVolume}
        onChange={e => onEffectsVolume(Number(e.target.value))}
      />
    </>
  );

  if (isMobile) {
    return (
      <div className="audio-controls audio-controls--mobile">
        <button
          className="audio-controls__mute"
          onClick={() => setIsExpanded(prev => !prev)}
          aria-label="Open audio controls"
          aria-pressed={isExpanded}
          aria-expanded={isExpanded}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        {isExpanded && (
          <div className="audio-controls__popover">
            {sliders}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`audio-controls${muted ? ' audio-controls--muted' : ''}`}>
      <button
        className="audio-controls__mute"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
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
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={musicVolume}
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
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={effectsVolume}
        onChange={e => onEffectsVolume(Number(e.target.value))}
      />
    </div>
  );
}
