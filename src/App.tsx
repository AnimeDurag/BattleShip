import './styles/global.css';
import { useGameState } from './hooks/useGameState';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import GameOver from './components/GameOver';
import MainMenu from './components/Mainmenu';
import PvPHandoffScreen from './components/PvPHandoffScreen';
import PvPGameOver from './components/PvPGameOver';
import BoardGrid from './components/BoardGrid';
import FleetRoster from './components/FleetRoster';
import { useSessionStats } from './hooks/useSessionStats';
import { initialSessionStats } from './hooks/useSessionStats';
import { usePvPGameState } from './hooks/usePvPGameState';
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from './models/types';

export default function App() {
  // ── Screen routing ───────────────────────────────────────────────────────
  const [screen, setScreen] = useState<'menu' | 'game' | 'pvp'>('menu');

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
  const { stats: soloStats, pvpStats, recordResult, recordPvPResult } = useSessionStats();

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

  // ── PvP game state ───────────────────────────────────────────────────────
  const pvp = usePvPGameState();

  // Guard against double-recording PvP results
  const pvpRecordedRef = useRef(false);
  useEffect(() => {
    if (pvp.pvpPhase === 'gameover' && pvp.winner !== null) {
      if (!pvpRecordedRef.current) {
        pvpRecordedRef.current = true;
        recordPvPResult({
          winner:  pvp.winner,
          p1Shots: pvp.p1Shots,
          p2Shots: pvp.p2Shots,
          p1Hits:  pvp.p1Hits,
          p2Hits:  pvp.p2Hits,
        });
      }
    } else {
      pvpRecordedRef.current = false;
    }
  }, [pvp.pvpPhase, pvp.winner, pvp.p1Shots, pvp.p2Shots, pvp.p1Hits, pvp.p2Hits, recordPvPResult]);

  // ── Board reveal — hides the GameOver overlay so the player can inspect
  // the final board state, with a floating NEW BATTLE button to restart.
  const [boardRevealed, setBoardRevealed] = useState(false);

  // Reset boardRevealed whenever we return to the game's setup phase.
  useEffect(() => {
    if (phase === 'setup') setBoardRevealed(false);
  }, [phase]);

  // ── Mode selection handlers ──────────────────────────────────────────────

  function handleSoloStart(diff: Difficulty) {
    selectDifficulty(diff);
    setScreen('game');
  }

  function handleRestart() {
    resetGame();
    setBoardRevealed(false);
    setScreen('menu');
  }

  // ── PvP board review (mirrors solo boardRevealed) ───────────────────────
  const [pvpBoardRevealed, setPvpBoardRevealed] = useState(false);

  function handlePvPRestart() {
    pvp.resetPvP();
    setPvpBoardRevealed(false);
    setScreen('menu');
  }

  // ── PvP screen ───────────────────────────────────────────────────────────
  if (screen === 'pvp') {
    const { pvpPhase, currentPlayer, startingPlayer } = pvp;

    // ── Handoff screens ──
    if (pvpPhase === 'handoff-to-p2-setup') {
      return (
        <PvPHandoffScreen
          message="PLAYER 1 SETUP COMPLETE"
          subMessage="PLAYER 2 — PRESS ANY KEY TO BEGIN YOUR FLEET DEPLOYMENT"
          onAdvance={pvp.advanceHandoff}
        />
      );
    }

    if (pvpPhase === 'handoff-to-battle') {
      return (
        <PvPHandoffScreen
          message={`PLAYER ${startingPlayer} GOES FIRST`}
          subMessage="PRESS ANY KEY TO BEGIN BATTLE"
          onAdvance={pvp.advanceHandoff}
        />
      );
    }

    if (pvpPhase === 'handoff-between-turns') {
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      return (
        <PvPHandoffScreen
          message={`PLAYER ${nextPlayer}'S TURN`}
          subMessage="PRESS ANY KEY TO REVEAL YOUR BOARD"
          onAdvance={pvp.advanceHandoff}
        />
      );
    }

    // ── Game over ──
    if (pvpPhase === 'gameover' && pvp.winner !== null) {
      // Board review — both players' waters visible with all ships revealed
      if (pvpBoardRevealed) {
        return (
          <>
            <div className="scanlines" />
            <div className="app">
              <header className="header">
                <div className="header__logo">BATTLE<span>SHIP</span></div>
                <div className="header__status">
                  <div className="status-pill">BATTLE REVIEW</div>
                  <div className="status-pill status-pill--active">
                    PLAYER {pvp.winner} WINS
                  </div>
                </div>
              </header>
              <div className="pvp-review">
                <div className="pvp-review__col">
                  <div className="board-label">PLAYER 1'S WATERS</div>
                  <BoardGrid board={pvp.p1Board} isOwn={true} phase="gameover" />
                  <FleetRoster ships={pvp.p1Board.ships} label="P1 FLEET STATUS" />
                </div>
                <div className="pvp-review__col">
                  <div className="board-label">PLAYER 2'S WATERS</div>
                  <BoardGrid board={pvp.p2Board} isOwn={true} phase="gameover" />
                  <FleetRoster ships={pvp.p2Board.ships} label="P2 FLEET STATUS" />
                </div>
              </div>
            </div>
            <button
              className="btn btn--primary floating-new-battle"
              onClick={handlePvPRestart}
            >
              ⟳ NEW BATTLE
            </button>
          </>
        );
      }

      return (
        <PvPGameOver
          winner={pvp.winner}
          p1Shots={pvp.p1Shots}
          p2Shots={pvp.p2Shots}
          p1Hits={pvp.p1Hits}
          p2Hits={pvp.p2Hits}
          onRestart={handlePvPRestart}
          onViewBoard={() => setPvpBoardRevealed(true)}
        />
      );
    }

    // ── Setup screens ──
    if (pvpPhase === 'setup-p1') {
      return (
        <>
          <div className="scanlines" />
          <div className="app">
            <header className="header">
              <div className="header__logo">BATTLE<span>SHIP</span></div>
              <div className="header__status">
                <div className="status-pill">PLAYER 1 — FLEET DEPLOYMENT</div>
              </div>
            </header>
            <SetupScreen
              playerBoard={pvp.p1Board}
              setupState={pvp.p1SetupState}
              allShipsPlaced={pvp.p1AllShipsPlaced}
              sessionStats={initialSessionStats()}
              playerLabel="PLAYER 1"
              onSelectShip={pvp.selectP1Ship}
              onSetOrientation={pvp.setP1Orientation}
              onCellClick={pvp.placeP1Ship}
              onRandomize={pvp.randomizeP1Board}
              onClearBoard={pvp.clearP1Board}
              onBeginGame={pvp.finishP1Setup}
            />
          </div>
        </>
      );
    }

    if (pvpPhase === 'setup-p2') {
      return (
        <>
          <div className="scanlines" />
          <div className="app">
            <header className="header">
              <div className="header__logo">BATTLE<span>SHIP</span></div>
              <div className="header__status">
                <div className="status-pill">PLAYER 2 — FLEET DEPLOYMENT</div>
              </div>
            </header>
            <SetupScreen
              playerBoard={pvp.p2Board}
              setupState={pvp.p2SetupState}
              allShipsPlaced={pvp.p2AllShipsPlaced}
              sessionStats={initialSessionStats()}
              playerLabel="PLAYER 2"
              onSelectShip={pvp.selectP2Ship}
              onSetOrientation={pvp.setP2Orientation}
              onCellClick={pvp.placeP2Ship}
              onRandomize={pvp.randomizeP2Board}
              onClearBoard={pvp.clearP2Board}
              onBeginGame={pvp.finishP2Setup}
            />
          </div>
        </>
      );
    }

    // ── Playing ──
    const activeLabel = `PLAYER ${currentPlayer}'S TURN`;
    return (
      <>
        <div className="scanlines" />
        <div className="app">
          <header className="header">
            <div className="header__logo">BATTLE<span>SHIP</span></div>
            <div className="header__status">
              <div className="status-pill status-pill--active">{activeLabel}</div>
              <div className="status-pill status-pill--neutral">
                {`MISSILES FIRED: ${currentPlayer === 1 ? pvp.p1Shots : pvp.p2Shots}`}
              </div>
            </div>
          </header>
          <GameScreen
            gameState={pvp.currentGameState}
            log={pvp.log}
            aiThinking={false}
            onFireAt={pvp.fireAt}
          />
        </div>
      </>
    );
  }

  // ── Main menu ────────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <MainMenu
        onSoloStart={handleSoloStart}
        onPvPStart={() => setScreen('pvp')}
        soloStats={soloStats}
        pvpStats={pvpStats}
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
            sessionStats={soloStats}
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
          sessionStats={soloStats}
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
