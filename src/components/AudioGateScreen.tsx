import { useRef, useEffect } from 'react';

interface AudioGateScreenProps {
  onUnlock: () => void;
}

export default function AudioGateScreen({ onUnlock }: AudioGateScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onUnlock();
    }
  }

  return (
    <div
      className="audio-gate"
      role="dialog"
      aria-modal="true"
      aria-label="Enable audio to begin"
      tabIndex={0}
      ref={rootRef}
      onClick={onUnlock}
      onKeyDown={handleKeyDown}
    >
      <div className="audio-gate__title">BATTLE<span>SHIP</span></div>
      <div className="audio-gate__message">CLICK ANYWHERE TO ENABLE AUDIO</div>
      <div className="audio-gate__sub">And begin your mission</div>
      <div className="audio-gate__prompt">▶ CLICK TO CONTINUE ◀</div>
    </div>
  );
}
