import { useEffect } from 'react';

interface PvPHandoffScreenProps {
  message:     string;
  subMessage?: string;
  onAdvance:   () => void;
}

export default function PvPHandoffScreen({ message, subMessage, onAdvance }: PvPHandoffScreenProps) {
  useEffect(() => {
    function handleKeyDown() {
      onAdvance();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAdvance]);

  return (
    <div className="pvp-handoff">
      <div className="pvp-handoff__message">{message}</div>
      {subMessage && <div className="pvp-handoff__sub">{subMessage}</div>}
      <div className="pvp-handoff__prompt">PRESS ANY KEY TO CONTINUE</div>
    </div>
  );
}
