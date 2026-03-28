import './styles/global.css';
import { useGameState } from './hooks/useGameState';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import GameOver from './components/GameOver';
import DifficultySelect from './components/DifficultySelect';
import { useSessionStats } from './hooks/useSessionStats';
import { useEffect, useRef, useState } from 'react';

export default function App() {
  const {
    gameState,
    setupState,
    log,
    aiThinking,
    battleStarting,
    allShipsPlaced,
    selectShip,
    setOrientation,
    placeSelectedShip,
    randomizePlacement,
    clearBoard,
    beginGame,
    selectDifficulty,
    difficulty,
    fireAt,
    resetGame,
  } = useGameState();

  const { phase, winner, shotCount } = gameState;

  // ── Session stats ────────────────────────────────────────────────────────
  const { stats: sessionStats, recordResult } = useSessionStats();

  // Guard against React StrictMode double-invocation and re-recording on
  // re-renders: only record once per unique shotCount+winner combination.
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase === 'gameover' && winner && difficulty) {
      const key = `${winner}-${shotCount}-${difficulty}`;
      if (recordedRef.current !== key) {
        recordedRef.current = key;
        recordResult({ winner, shotCount, difficulty });
      }
    }
    if (phase === 'setup') recordedRef.current = null;
  }, [phase, winner, shotCount, difficulty, recordResult]);

  // ── Board reveal — hides the GameOver overlay so the player can inspect
  // the final board state, with a floating NEW BATTLE button to restart.
  const [boardRevealed, setBoardRevealed] = useState(false);

  // Reset boardRevealed when a new game starts.
  useEffect(() => {
    if (phase === 'setup') setBoardRevealed(false);
  }, [phase]);

  return (
    <>
      <div className="scanlines" />

      {/* ── Difficulty selection — blocks all interaction until chosen ── */}
      {difficulty === null && (
        <DifficultySelect onSelect={selectDifficulty} />
      )}

      {/* ── Battle commencing transition ── */}
      {battleStarting && (
        <div className="battle-start-overlay">
          <div className="battle-start-panel">
            <div className="battle-start-panel__title">BATTLE COMMENCING</div>
            <p className="battle-start-panel__sub">PREPARE FOR ENGAGEMENT</p>
          </div>
        </div>
      )}

      <div className="app">
        {/* ── Header ── */}
        <header className="header">
          <div className="header__logo">BATTLE<span>SHIP</span></div>

          {phase === 'playing' && (
            <div className="header__status">
              <div className={`status-pill${gameState.currentTurn === 'player' && !aiThinking ? ' status-pill--active' : ''}`}>
                YOUR TURN
              </div>
              <div className={`status-pill${aiThinking ? ' status-pill--active' : ''}`}>
                ENEMY TURN
              </div>
              <div className="status-pill status-pill--neutral">
                {`MISSILES FIRED: ${shotCount}`}
              </div>
              {difficulty && (
                <div className={`status-pill status-pill--diff-${difficulty}`}>
                  THREAT: {difficulty.toUpperCase()}
                </div>
              )}
              {aiThinking && (
                <div className="header__thinking">AI TARGETING...</div>
              )}
            </div>
          )}

          {phase === 'setup' && (
            <div className="header__status">
              <div className="status-pill">FLEET DEPLOYMENT</div>
              {difficulty && (
                <div className={`status-pill status-pill--diff-${difficulty}`}>
                  THREAT: {difficulty.toUpperCase()}
                </div>
              )}
            </div>
          )}
        </header>

        {/* ── Phase routing ── */}
        {phase === 'setup' && (
          <SetupScreen
            playerBoard={gameState.playerBoard}
            setupState={setupState}
            allShipsPlaced={allShipsPlaced}
            sessionStats={sessionStats}
            onSelectShip={selectShip}
            onSetOrientation={setOrientation}
            onCellClick={placeSelectedShip}
            onRandomize={randomizePlacement}
            onClearBoard={clearBoard}
            onBeginGame={beginGame}
          />
        )}

        {(phase === 'playing' || phase === 'gameover') && (
          <GameScreen
            gameState={gameState}
            log={log}
            aiThinking={aiThinking}
            onFireAt={fireAt}
          />
        )}
      </div>

      {/* ── Game over overlay ── */}
      {phase === 'gameover' && winner && !boardRevealed && (
        <GameOver
          winner={winner}
          shotCount={shotCount}
          difficulty={difficulty}
          sessionStats={sessionStats}
          onRestart={resetGame}
          onViewBoard={() => setBoardRevealed(true)}
        />
      )}

      {/* ── Floating NEW BATTLE button (shown when board is revealed) ── */}
      {phase === 'gameover' && boardRevealed && (
        <button
          className="btn btn--primary floating-new-battle"
          onClick={() => { setBoardRevealed(false); resetGame(); }}
        >
          ⟳ NEW BATTLE
        </button>
      )}
    </>
  );
}