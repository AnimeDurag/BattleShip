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
      {/* Mini own board — non-interactive */}
      <div className="mobile-game-screen__mini-board">
        <div className="board-grid--mini">
          <BoardGrid
            board={playerBoard}
            isOwn={true}
            phase="playing"
            hideLabels={true}
          />
        </div>
      </div>

      {/* Enemy board — full width, primary interaction */}
      <div className="mobile-game-screen__enemy-board">
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
      </div>

      {/* Combat log + fleet roster */}
      <div className="mobile-game-screen__log-fleet">
        {/* Expandable combat log */}
        <div className="mobile-combat-log">
          <div className="mobile-combat-log__entries">
            {(logExpanded ? log : log.slice(0, 5)).map(entry => (
              <div key={entry.id} className={`combat-log__entry combat-log__entry--${entry.type}`}>
                {entry.message}
              </div>
            ))}
          </div>
          {log.length > 5 && (
            <button
              className="mobile-combat-log__toggle"
              onClick={() => setLogExpanded(prev => !prev)}
            >
              {logExpanded ? '▲ HIDE' : `▼ +${log.length - 5} MORE`}
            </button>
          )}
        </div>

        {/* Compact fleet roster */}
        <FleetRoster ships={playerBoard.ships}   label="YOUR FLEET"  compact />
        <FleetRoster ships={opponentBoard.ships} label="ENEMY FLEET" compact enemy />
      </div>
    </div>
  );
}
