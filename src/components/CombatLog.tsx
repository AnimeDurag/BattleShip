import { LogEntry } from '../hooks/useGameState';

interface CombatLogProps {
  entries: LogEntry[];
  aiThinking: boolean;
}

export default function CombatLog({ entries, aiThinking }: CombatLogProps) {
  return (
    <div className="combat-log">
      <div className="panel__title">COMBAT LOG</div>

      {aiThinking && (
        <div className="combat-log__thinking">◈ ENEMY TARGETING...</div>
      )}

      <div className="combat-log__entries">
        {entries.map(entry => (
          <div
            key={entry.id}
            className={`combat-log__entry combat-log__entry--${entry.type}`}
          >
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}