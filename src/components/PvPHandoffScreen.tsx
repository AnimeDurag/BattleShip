import { useEffect } from 'react';
import type { SoundEffect } from '../audio/effects';

interface PvPHandoffScreenProps {
  message:      string;
  subMessage?:  string;
  ruleNote?:    string;
  onAdvance:    () => void;
  onPlayEffect: (effect: SoundEffect) => void;
}

export default function PvPHandoffScreen({ message, subMessage, ruleNote, onAdvance, onPlayEffect }: PvPHandoffScreenProps) {
  useEffect(() => {
    function handleKey() {
      onPlayEffect('handoffAdvance');
      onAdvance();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onAdvance, onPlayEffect]);

  function handleClick() {
    onPlayEffect('handoffAdvance');
    onAdvance();
  }

  return (
    <div className="pvp-handoff" onClick={handleClick}>
      <div className="pvp-handoff__message">{message}</div>
      {subMessage && <div className="pvp-handoff__sub">{subMessage}</div>}
      {ruleNote && <div className="pvp-handoff__rule">{ruleNote}</div>}
      <div className="pvp-handoff__prompt">PRESS ANY KEY OR TAP TO CONTINUE</div>
    </div>
  );
}
