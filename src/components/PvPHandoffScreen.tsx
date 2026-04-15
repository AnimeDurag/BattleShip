import { useEffect } from 'react';
import type { SoundEffect } from '../audio/effects';

interface PvPHandoffScreenProps {
  message:      string;
  subMessage?:  string;
  onAdvance:    () => void;
  onPlayEffect: (effect: SoundEffect) => void;
}

export default function PvPHandoffScreen({ message, subMessage, onAdvance, onPlayEffect }: PvPHandoffScreenProps) {
  useEffect(() => {
    function handleKeyDown() {
      onPlayEffect('handoffAdvance');
      onAdvance();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAdvance, onPlayEffect]);

  return (
    <div className="pvp-handoff">
      <div className="pvp-handoff__message">{message}</div>
      {subMessage && <div className="pvp-handoff__sub">{subMessage}</div>}
      <div className="pvp-handoff__prompt">PRESS ANY KEY TO CONTINUE</div>
    </div>
  );
}
