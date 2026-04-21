import { useState } from 'react';
import { GameState } from '../models/types';
import { LogEntry } from '../hooks/useGameState';
import BoardGrid from './BoardGrid';
import FleetRoster from './FleetRoster';

interface MobileGameScreenProps {
  gameState:  GameState;
  log:        LogEntry[];
  aiThinking: boolean;
  onFireAt:   (row: number, col: number) => void;
}

export default function MobileGameScreen({
  gameState,
  log,
  aiThinking,
  onFireAt,
}: MobileGameScreenProps) {
  const [logExpanded, setLogExpanded] = useState(false);

  const { playerBoard, opponentBoard, currentTurn } = gameState;
  const isPlayerTurn = gameState.phase === 'playing' && currentTurn === 'player' && !aiThinking;

  return (
    <div className="mobile-game-screen">
      {/* Own board — display-only status view, treated as image by screen readers */}
      <div className="mobile-game-screen__own-board">
        <div className="board-label">YOUR WATERS</div>
        <BoardGrid
          board={playerBoard}
          isOwn={true}
          phase="playing"
          boardRole="img"
        />
      </div>

      {/* Enemy board — full size, primary interaction */}
      <div className="mobile-game-screen__enemy-board">
        <div className="board-label">ENEMY WATERS</div>
        <div className="game-screen__board-wrap">
          <BoardGrid
            board={opponentBoard}
            isOwn={false}
            phase="playing"
            onCellClick={isPlayerTurn ? onFireAt : undefined}
          />
          {!isPlayerTurn && (
            <div className="board-locked-overlay" aria-hidden="true">
              <span className="board-locked-overlay__text">
                {aiThinking ? 'INCOMING…' : 'STAND BY'}
              </span>
            </div>
          )}
        </div>
        {isPlayerTurn && (
          <p className="game-screen__hint">SELECT TARGET COORDINATES</p>
        )}
      </div>

      {/* Combat log + fleet roster */}
      <div className="mobile-game-screen__log-fleet">
        <div className="mobile-combat-log">
          <div className="panel__title">COMBAT LOG</div>
          <div
            className="mobile-combat-log__entries"
            aria-live="polite"
            aria-atomic="false"
            aria-relevant="additions"
            aria-label="Combat log"
          >
            {(logExpanded ? log : log.slice(0, 5)).map(entry => (
              <div key={entry.id} className={`combat-log__entry combat-log__entry--${entry.type}`}>
                {entry.message}
              </div>
            ))}
          </div>
          {log.length > 5 && (
            <button
              className="mobile-combat-log__toggle"
              aria-label={logExpanded ? 'Collapse combat log' : `Expand combat log — ${log.length - 5} more entries`}
              aria-expanded={logExpanded}
              onClick={() => setLogExpanded(prev => !prev)}
            >
              {logExpanded ? '▲ HIDE' : `▼ +${log.length - 5} MORE`}
            </button>
          )}
        </div>

        <FleetRoster ships={playerBoard.ships}   label="YOUR FLEET"  compact />
        <FleetRoster ships={opponentBoard.ships} label="ENEMY FLEET" compact enemy />
      </div>
    </div>
  );
}
