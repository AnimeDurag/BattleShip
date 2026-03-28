import { useRef, useEffect, useState } from 'react';
import { LogEntry } from '../hooks/useGameState';

interface CombatLogProps {
  entries: LogEntry[];
  aiThinking: boolean;
}

export default function CombatLog({ entries, aiThinking }: CombatLogProps) {
  // Track the ID of the most recently highlighted entry so we can apply the
  // --new modifier class for exactly one render cycle after it arrives.
  const prevTopIdRef  = useRef<number | null>(null);
  const [newEntryId, setNewEntryId] = useState<number | null>(null);

  useEffect(() => {
    const topEntry = entries[0];
    if (!topEntry) return;
    if (topEntry.id !== prevTopIdRef.current) {
      prevTopIdRef.current = topEntry.id;
      setNewEntryId(topEntry.id);
      // Clear the class after the animation completes so it only fires once
      const t = setTimeout(() => setNewEntryId(null), 600);
      return () => clearTimeout(t);
    }
  }, [entries]);

  return (
    <div className="combat-log">
      <div className="panel__title">COMBAT LOG</div>

      {aiThinking && (
        <div className="combat-log__thinking">◈ ENEMY TARGETING...</div>
      )}

      <div
        className="combat-log__entries"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        aria-label="Combat log"
      >
        {entries.map(entry => (
          <div
            key={entry.id}
            className={[
              'combat-log__entry',
              `combat-log__entry--${entry.type}`,
              entry.id === newEntryId ? 'combat-log__entry--new' : '',
            ].join(' ').trim()}
          >
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}