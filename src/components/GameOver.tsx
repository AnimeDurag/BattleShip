interface GameOverProps {
  winner: 'player' | 'opponent';
  turnCount: number;
  onRestart: () => void;
}

export default function GameOver({ winner, turnCount, onRestart }: GameOverProps) {
  const isVictory = winner === 'player';

  return (
    <div className="gameover-overlay">
      <div className="gameover-panel">
        <div className={`gameover-panel__title ${isVictory ? 'gameover-panel__title--victory' : 'gameover-panel__title--defeat'}`}>
          {isVictory ? 'VICTORY' : 'DEFEATED'}
        </div>

        <p className="gameover-panel__sub">
          {isVictory
            ? `ENEMY FLEET DESTROYED — ${turnCount} MISSILES FIRED`
            : `YOUR FLEET HAS BEEN SUNK — ${turnCount} ROUNDS ELAPSED`}
        </p>

        <button className="btn btn--primary" onClick={onRestart}>
          ⟳ NEW BATTLE
        </button>
      </div>
    </div>
  );
}