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
    function advance() {
      onPlayEffect('handoffAdvance');
      onAdvance();
    }
    window.addEventListener('keydown', advance);
    window.addEventListener('touchstart', advance);
    return () => {
      window.removeEventListener('keydown', advance);
      window.removeEventListener('touchstart', advance);
    };
  }, [onAdvance, onPlayEffect]);

  return (
    <div className="pvp-handoff">
      <div className="pvp-handoff__message">{message}</div>
      {subMessage && <div className="pvp-handoff__sub">{subMessage}</div>}
      {ruleNote && <div className="pvp-handoff__rule">{ruleNote}</div>}
      <div className="pvp-handoff__prompt">PRESS ANY KEY OR TAP TO CONTINUE</div>
    </div>
  );
}
