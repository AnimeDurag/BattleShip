import './styles/global.css';
import { useGameState } from './hooks/useGameState';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import GameOver from './components/GameOver';
import MainMenu from './components/Mainmenu';
import { useSessionStats } from './hooks/useSessionStats';
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from './models/types';

export default function App() {
  // ── Screen routing ───────────────────────────────────────────────────────
  // 'menu' — main menu (mode + difficulty selection)
  // 'game' — full game tree (setup → playing → gameover)
  //
  // GamePhase in types.ts is intentionally unchanged — it lives on GameState
  // (a model layer concern) and has no awareness of the menu. Screen routing
  // is a pure UI concern managed here in App.
  const [screen, setScreen] = useState<'menu' | 'game'>('menu');

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

  // Reset boardRevealed whenever we return to the game's setup phase.
  useEffect(() => {
    if (phase === 'setup') setBoardRevealed(false);
  }, [phase]);

  // ── Mode selection handlers ──────────────────────────────────────────────

  // Called when the player picks Solo vs AI + a difficulty from the menu.
  // selectDifficulty feeds the chosen tier into useGameState so beginGame()
  // and calcScore() both receive the correct value.
  function handleSoloStart(diff: Difficulty) {
    selectDifficulty(diff);
    setScreen('game');
  }

  // Called from both ⟳ NEW BATTLE buttons (GameOver overlay + floating btn).
  // Resets all game state AND returns to the main menu so the player picks
  // a difficulty fresh on every game.
  function handleRestart() {
    resetGame();          // clears difficulty → null, resets board + counters
    setBoardRevealed(false);
    setScreen('menu');
  }

  // ── Main menu ────────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <MainMenu
        onSoloStart={handleSoloStart}
        sessionStats={sessionStats}
      />
    );
  }

  // ── Game tree (setup → playing → gameover) ───────────────────────────────
  return (
    <>
      <div className="scanlines" />

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
          onRestart={handleRestart}
          onViewBoard={() => setBoardRevealed(true)}
        />
      )}

      {/* ── Floating NEW BATTLE button (shown when board is revealed) ── */}
      {phase === 'gameover' && boardRevealed && (
        <button
          className="btn btn--primary floating-new-battle"
          onClick={handleRestart}
        >
          ⟳ NEW BATTLE
        </button>
      )}
    </>
  );
}