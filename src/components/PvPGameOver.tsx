import { useRef, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface PvPGameOverProps {
  winner:       1 | 2;
  p1Shots:      number;
  p2Shots:      number;
  p1Hits:       number;
  p2Hits:       number;
  onRestart:    () => void;
  onViewBoard?: () => void;
}

function formatAccuracy(hits: number, shots: number): string {
  if (shots === 0) return '—';
  return `${Math.floor((hits / shots) * 100)}%`;
}

export default function PvPGameOver({ winner, p1Shots, p2Shots, p1Hits, p2Hits, onRestart, onViewBoard }: PvPGameOverProps) {
  const panelRef      = useRef<HTMLDivElement>(null);
  const restartBtnRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef);

  useEffect(() => {
    restartBtnRef.current?.focus();
  }, []);

  return (
    <div className="gameover-overlay">
      <div
        className="gameover-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Player ${winner} wins`}
        ref={panelRef}
      >
        <div className="gameover-panel__accent" />

        {onViewBoard && (
          <button
            className="gameover-panel__close"
            aria-label="Close and review boards"
            onClick={onViewBoard}
          >
            ✕
          </button>
        )}

        <div className="gameover-panel__title gameover-panel__title--victory">
          PLAYER {winner} WINS
        </div>

        <table className="pvp-results-table">
          <thead>
            <tr>
              <th></th>
              <th>PLAYER 1</th>
              <th>PLAYER 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SHOTS FIRED</td>
              <td>{p1Shots}</td>
              <td>{p2Shots}</td>
            </tr>
            <tr>
              <td>HITS LANDED</td>
              <td>{p1Hits}</td>
              <td>{p2Hits}</td>
            </tr>
            <tr>
              <td>ACCURACY</td>
              <td>{formatAccuracy(p1Hits, p1Shots)}</td>
              <td>{formatAccuracy(p2Hits, p2Shots)}</td>
            </tr>
          </tbody>
        </table>

        <button
          ref={restartBtnRef}
          className="btn btn--primary gameover-panel__btn"
          onClick={onRestart}
        >
          ⟳ NEW BATTLE
        </button>
      </div>
    </div>
  );
}
