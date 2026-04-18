import './styles/global.css';
import { useGameState } from './hooks/useGameState';
import { useSoundManager } from './hooks/useSoundManager';
import SetupScreen from './components/SetupScreen';
import MobileSetupScreen from './components/MobileSetupScreen';
import GameScreen from './components/GameScreen';
import MobileGameScreen from './components/MobileGameScreen';
import GameOver from './components/GameOver';
import MainMenu from './components/Mainmenu';
import PvPHandoffScreen from './components/PvPHandoffScreen';
import PvPGameOver from './components/PvPGameOver';
import AudioGateScreen from './components/AudioGateScreen';
import AudioControls from './components/AudioControls';
import BoardGrid from './components/BoardGrid';
import FleetRoster from './components/FleetRoster';
import { useSessionStats } from './hooks/useSessionStats';
import { initialSessionStats } from './hooks/useSessionStats';
import { usePvPGameState } from './hooks/usePvPGameState';
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from './models/types';

export default function App() {
  // ── Sound manager ────────────────────────────────────────────────────────
  const sounds = useSoundManager();

  // ── Mobile detection ─────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Screen routing ───────────────────────────────────────────────────────
  const audioUnlocked = localStorage.getItem('battleship-audio-unlocked') === 'true';
  const [screen, setScreen] = useState<'audio-gate' | 'menu' | 'game' | 'pvp'>(
    audioUnlocked ? 'menu' : 'audio-gate'
  );

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

  // ── Board reveal ─────────────────────────────────────────────────────────
  const [boardRevealed, setBoardRevealed] = useState(false);
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

  // ── PvP board review ─────────────────────────────────────────────────────
  const [pvpBoardRevealed, setPvpBoardRevealed] = useState(false);

  function handlePvPRestart() {
    pvp.resetPvP();
    setPvpBoardRevealed(false);
    setScreen('menu');
  }

  // ── Sound-wrapped setup callbacks (solo) ─────────────────────────────────

  function handlePlaceShip(row: number, col: number): boolean {
    const result = placeSelectedShip(row, col);
    if (result) sounds.playEffect('shipPlace');
    return result;
  }

  function handleClearBoard() {
    clearBoard();
    sounds.playEffect('shipClear');
  }

  function handleRandomize() {
    randomizePlacement();
    sounds.playEffect('randomize');
  }

  // ── Sound-wrapped setup callbacks (PvP P1) ───────────────────────────────

  function handleP1PlaceShip(row: number, col: number): boolean {
    const result = pvp.placeP1Ship(row, col);
    if (result) sounds.playEffect('shipPlace');
    return result;
  }

  function handleP1ClearBoard() {
    pvp.clearP1Board();
    sounds.playEffect('shipClear');
  }

  function handleP1Randomize() {
    pvp.randomizeP1Board();
    sounds.playEffect('randomize');
  }

  // ── Sound-wrapped setup callbacks (PvP P2) ───────────────────────────────

  function handleP2PlaceShip(row: number, col: number): boolean {
    const result = pvp.placeP2Ship(row, col);
    if (result) sounds.playEffect('shipPlace');
    return result;
  }

  function handleP2ClearBoard() {
    pvp.clearP2Board();
    sounds.playEffect('shipClear');
  }

  function handleP2Randomize() {
    pvp.randomizeP2Board();
    sounds.playEffect('randomize');
  }

  // ── Music wiring — phase/screen transitions ──────────────────────────────
  const pvpPhase = pvp.pvpPhase;

  useEffect(() => {
    if (!sounds.audioUnlocked) return;

    if (screen === 'audio-gate') { sounds.stopMusic(); return; }
    if (screen === 'menu')       { sounds.playTrack('menu'); return; }

    if (screen === 'game') {
      if (phase === 'setup')   { sounds.playTrack('setup');  return; }
      if (phase === 'playing') { sounds.playTrack('battle'); return; }
      if (phase === 'gameover') {
        sounds.playTrack(winner === 'player' ? 'victory' : 'defeat');
        return;
      }
    }

    if (screen === 'pvp') {
      if (pvpPhase === 'gameover') { sounds.playTrack('victory'); return; }
      if (pvpPhase === 'playing' || pvpPhase === 'handoff-to-battle' || pvpPhase === 'handoff-between-turns') {
        sounds.playTrack('battle');
        return;
      }
      sounds.playTrack('setup'); // setup-p1, handoff-to-p2-setup, setup-p2
    }
  }, [screen, phase, pvpPhase, winner, sounds.audioUnlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Combat log sound effects ─────────────────────────────────────────────
  const latestLogEntry = screen === 'game' ? log[0] : pvp.log[0];

  useEffect(() => {
    if (!latestLogEntry) return;
    switch (latestLogEntry.type) {
      case 'hit':   sounds.playEffect('hit');     break;
      case 'miss':  sounds.playEffect('miss');    break;
      case 'sunk':  sounds.playEffect('sunk');    break;
      case 'enemy': sounds.playEffect('aiFires'); break;
    }
  }, [latestLogEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI thinking sound ────────────────────────────────────────────────────
  useEffect(() => {
    if (aiThinking) sounds.playEffect('aiThinking');
  }, [aiThinking]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AudioControls — shared across all screens ─────────────────────────────
  const audioControls = (
    <AudioControls
      muted={sounds.muted}
      musicVolume={sounds.musicVolume}
      effectsVolume={sounds.effectsVolume}
      onToggleMute={sounds.toggleMute}
      onMusicVolume={sounds.setMusicVolume}
      onEffectsVolume={sounds.setEffectsVolume}
      isMobile={isMobile}
    />
  );

  // ── Audio gate ───────────────────────────────────────────────────────────
  if (screen === 'audio-gate') {
    return (
      <>
        <AudioGateScreen onUnlock={() => {
          sounds.unlockAudio();
          setScreen('menu');
        }} />
        {audioControls}
      </>
    );
  }

  // ── PvP screen ───────────────────────────────────────────────────────────
  if (screen === 'pvp') {
    const { pvpPhase: currentPvpPhase, currentPlayer, startingPlayer } = pvp;

    if (currentPvpPhase === 'handoff-to-p2-setup') {
      return (
        <>
          <PvPHandoffScreen
            message="PLAYER 1 SETUP COMPLETE"
            subMessage="PLAYER 2 — PRESS ANY KEY TO BEGIN YOUR FLEET DEPLOYMENT"
            onAdvance={pvp.advanceHandoff}
            onPlayEffect={sounds.playEffect}
          />
          {audioControls}
        </>
      );
    }

    if (currentPvpPhase === 'handoff-to-battle') {
      return (
        <>
          <PvPHandoffScreen
            message={`PLAYER ${startingPlayer} GOES FIRST`}
            subMessage="PRESS ANY KEY TO BEGIN BATTLE"
            ruleNote="KEEP FIRING ON HITS — your turn continues until you miss."
            onAdvance={pvp.advanceHandoff}
            onPlayEffect={sounds.playEffect}
          />
          {audioControls}
        </>
      );
    }

    if (currentPvpPhase === 'handoff-between-turns') {
      const nextPlayer = currentPlayer === 1 ? 2 : 1;
      return (
        <>
          <PvPHandoffScreen
            message={`PLAYER ${nextPlayer}'S TURN`}
            subMessage="PRESS ANY KEY TO REVEAL YOUR BOARD"
            ruleNote="KEEP FIRING ON HITS — your turn continues until you miss."
            onAdvance={pvp.advanceHandoff}
            onPlayEffect={sounds.playEffect}
          />
          {audioControls}
        </>
      );
    }

    if (currentPvpPhase === 'gameover' && pvp.winner !== null) {
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
            {audioControls}
          </>
        );
      }

      return (
        <>
          <PvPGameOver
            winner={pvp.winner}
            p1Shots={pvp.p1Shots}
            p2Shots={pvp.p2Shots}
            p1Hits={pvp.p1Hits}
            p2Hits={pvp.p2Hits}
            onRestart={handlePvPRestart}
            onViewBoard={() => setPvpBoardRevealed(true)}
          />
          {audioControls}
        </>
      );
    }

    if (currentPvpPhase === 'setup-p1') {
      const p1SetupProps = {
        playerBoard:      pvp.p1Board,
        setupState:       pvp.p1SetupState,
        allShipsPlaced:   pvp.p1AllShipsPlaced,
        sessionStats:     initialSessionStats(),
        playerLabel:      'PLAYER 1' as const,
        onSelectShip:     pvp.selectP1Ship,
        onSetOrientation: pvp.setP1Orientation,
        onCellClick:      handleP1PlaceShip,
        onRandomize:      handleP1Randomize,
        onClearBoard:     handleP1ClearBoard,
        onBeginGame:      pvp.finishP1Setup,
      };
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
            {isMobile
              ? <MobileSetupScreen {...p1SetupProps} />
              : <SetupScreen      {...p1SetupProps} />
            }
          </div>
          {audioControls}
        </>
      );
    }

    if (currentPvpPhase === 'setup-p2') {
      const p2SetupProps = {
        playerBoard:      pvp.p2Board,
        setupState:       pvp.p2SetupState,
        allShipsPlaced:   pvp.p2AllShipsPlaced,
        sessionStats:     initialSessionStats(),
        playerLabel:      'PLAYER 2' as const,
        onSelectShip:     pvp.selectP2Ship,
        onSetOrientation: pvp.setP2Orientation,
        onCellClick:      handleP2PlaceShip,
        onRandomize:      handleP2Randomize,
        onClearBoard:     handleP2ClearBoard,
        onBeginGame:      pvp.finishP2Setup,
      };
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
            {isMobile
              ? <MobileSetupScreen {...p2SetupProps} />
              : <SetupScreen      {...p2SetupProps} />
            }
          </div>
          {audioControls}
        </>
      );
    }

    // Playing
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
          {isMobile
            ? <MobileGameScreen gameState={pvp.currentGameState} log={pvp.log} aiThinking={false} onFireAt={pvp.fireAt} />
            : <GameScreen       gameState={pvp.currentGameState} log={pvp.log} aiThinking={false} onFireAt={pvp.fireAt} />
          }
        </div>
        {audioControls}
      </>
    );
  }

  // ── Main menu ────────────────────────────────────────────────────────────
  if (screen === 'menu') {
    return (
      <>
        <MainMenu
          onSoloStart={handleSoloStart}
          onPvPStart={() => setScreen('pvp')}
          soloStats={soloStats}
          pvpStats={pvpStats}
          onPlayEffect={sounds.playEffect}
        />
        {audioControls}
      </>
    );
  }

  // ── Game tree (setup → playing → gameover) ───────────────────────────────
  return (
    <>
      <div className="scanlines" />

      {battleStarting && (
        <div className="battle-start-overlay">
          <div className="battle-start-panel">
            <div className="battle-start-panel__title">BATTLE COMMENCING</div>
            <p className="battle-start-panel__sub">PREPARE FOR ENGAGEMENT</p>
          </div>
        </div>
      )}

      <div className="app">
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

        {phase === 'setup' && (isMobile
          ? <MobileSetupScreen
              playerBoard={gameState.playerBoard}
              setupState={setupState}
              allShipsPlaced={allShipsPlaced}
              sessionStats={soloStats}
              onSelectShip={selectShip}
              onSetOrientation={setOrientation}
              onCellClick={handlePlaceShip}
              onRandomize={handleRandomize}
              onClearBoard={handleClearBoard}
              onBeginGame={beginGame}
            />
          : <SetupScreen
              playerBoard={gameState.playerBoard}
              setupState={setupState}
              allShipsPlaced={allShipsPlaced}
              sessionStats={soloStats}
              onSelectShip={selectShip}
              onSetOrientation={setOrientation}
              onCellClick={handlePlaceShip}
              onRandomize={handleRandomize}
              onClearBoard={handleClearBoard}
              onBeginGame={beginGame}
            />
        )}

        {(phase === 'playing' || phase === 'gameover') && (isMobile
          ? <MobileGameScreen gameState={gameState} log={log} aiThinking={aiThinking} onFireAt={fireAt} />
          : <GameScreen       gameState={gameState} log={log} aiThinking={aiThinking} onFireAt={fireAt} />
        )}
      </div>

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

      {phase === 'gameover' && boardRevealed && (
        <button
          className="btn btn--primary floating-new-battle"
          onClick={handleRestart}
        >
          ⟳ NEW BATTLE
        </button>
      )}

      {audioControls}
    </>
  );
}
