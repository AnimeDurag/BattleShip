import { GameState } from '../models/types';
import { LogEntry } from '../hooks/useGameState';
import BoardGrid from './BoardGrid';
import FleetRoster from './FleetRoster';
import CombatLog from './CombatLog';

interface GameScreenProps {
  gameState: GameState;
  log: LogEntry[];
  aiThinking: boolean;
  onFireAt: (row: number, col: number) => void;
}

export default function GameScreen({
  gameState,
  log,
  aiThinking,
  onFireAt,
}: GameScreenProps) {
  const { playerBoard, opponentBoard, currentTurn, turnCount } = gameState;
  const isPlayerTurn = currentTurn === 'player' && !aiThinking;

  return (
    <div className="game-screen">
      {/* ── Left panel: rosters + log ── */}
      <aside className="game-screen__sidebar panel">
        <FleetRoster ships={playerBoard.ships}   label="YOUR FLEET"   />
        <div className="divider" />
        <FleetRoster ships={opponentBoard.ships} label="ENEMY FLEET" enemy />
        <div className="divider" />
        <CombatLog entries={log} aiThinking={aiThinking} />
      </aside>

      {/* ── Player board ── */}
      <div className="game-screen__board-col">
        <div className="board-label">YOUR WATERS</div>
        <BoardGrid
          board={playerBoard}
          isOwn={true}
          phase="playing"
        />
      </div>

      {/* ── Enemy board ── */}
      <div className="game-screen__board-col">
        <div className="board-label">ENEMY WATERS</div>
        <BoardGrid
          board={opponentBoard}
          isOwn={false}
          phase="playing"
          onCellClick={isPlayerTurn ? onFireAt : undefined}
        />
        {isPlayerTurn && (
          <p className="game-screen__hint">SELECT TARGET COORDINATES</p>
        )}
      </div>
    </div>
  );
}