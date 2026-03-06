import './styles/global.css';
import { useGameState } from './hooks/useGameState';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import GameOver from './components/GameOver';

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
    beginGame,
    fireAt,
    resetGame,
  } = useGameState();

  const { phase, winner, turnCount } = gameState;

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
                MISSILES FIRED: {turnCount}
              </div>
              {aiThinking && (
                <div className="header__thinking">AI TARGETING...</div>
              )}
            </div>
          )}

          {phase === 'setup' && (
            <div className="header__status">
              <div className="status-pill">FLEET DEPLOYMENT</div>
            </div>
          )}
        </header>

        {/* ── Phase routing ── */}
        {phase === 'setup' && (
          <SetupScreen
            playerBoard={gameState.playerBoard}
            setupState={setupState}
            allShipsPlaced={allShipsPlaced}
            onSelectShip={selectShip}
            onSetOrientation={setOrientation}
            onCellClick={placeSelectedShip}
            onRandomize={randomizePlacement}
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
      {phase === 'gameover' && winner && (
        <GameOver
          winner={winner}
          turnCount={turnCount}
          onRestart={resetGame}
        />
      )}
    </>
  );
}