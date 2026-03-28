import { FLEET, SHIP_COLOR_VARS } from '../utils/constants';
import { cx } from '../utils/helpers';
import { SetupState } from '../hooks/useGameState';
import { winRate, avgShots } from '../hooks/useSessionStats';
import type { SessionStats } from '../hooks/useSessionStats';
import { Board } from '../models/types';
import BoardGrid from './BoardGrid';

interface SetupScreenProps {
  playerBoard: Board;
  setupState: SetupState;
  allShipsPlaced: boolean;
  sessionStats: SessionStats;
  onSelectShip: (name: string) => void;
  onSetOrientation: (o: 'horizontal' | 'vertical') => void;
  onCellClick: (row: number, col: number) => void;
  onRandomize: () => void;
  onClearBoard: () => void;
  onBeginGame: () => void;
  difficultyChosen?: boolean;   // disables keyboard nav on board when overlay is up
}

export default function SetupScreen({
  playerBoard,
  setupState,
  allShipsPlaced,
  sessionStats,
  onSelectShip,
  onSetOrientation,
  onCellClick,
  onRandomize,
  onClearBoard,
  onBeginGame,
  difficultyChosen = true,
}: SetupScreenProps) {
  const { placedShipNames, selectedShipName, orientation } = setupState;
  const selectedDef = FLEET.find(f => f.name === selectedShipName);
  const wr    = winRate(sessionStats);
  const shots = avgShots(sessionStats);

  return (
    <div className="setup-screen">
      {/* ── Board ── */}
      <div className="setup-screen__board-col">
        <div className="board-label">DEPLOY YOUR FLEET</div>

        <BoardGrid
          board={playerBoard}
          isOwn={true}
          phase="setup"
          onCellClick={onCellClick}
          setupShipSize={selectedDef?.size}
          setupOrientation={orientation}
          onRotate={() => onSetOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
          difficultyChosen={difficultyChosen}
        />

        <p className="setup-screen__hint">
          {selectedShipName
            ? `Placing: ${selectedShipName} (${selectedDef?.size} cells) — arrows/click to position · Space/Enter to place · R to rotate`
            : allShipsPlaced
            ? 'All ships deployed. Click any vessel to reposition it.'
            : 'Select a vessel from the roster →'}
        </p>
      </div>

      {/* ── Controls ── */}
      <div className="setup-screen__controls">
        <div className="panel">
          <div className="panel__title">SELECT VESSEL</div>
          <p className="setup-screen__roster-hint">
            Click any ship to select or reposition it.
          </p>
          {FLEET.map(def => {
            const placed    = placedShipNames.includes(def.name);
            const selected  = selectedShipName === def.name;
            const colorVar  = SHIP_COLOR_VARS[def.name];
            return (
              <div
                key={def.name}
                className={cx(
                  'ship-selector__item',
                  selected && 'ship-selector__item--selected',
                  placed   && 'ship-selector__item--placed',
                )}
                style={{ '--item-ship-color': `var(${colorVar})` } as React.CSSProperties}
                onClick={() => onSelectShip(def.name)}
              >
                <div className="ship-selector__info">
                  <div className="ship-selector__swatch" />
                  <span>{def.name}</span>
                </div>
                <div className="ship-selector__dots">
                  {Array.from({ length: def.size }).map((_, i) => (
                    <div key={i} className="ship-selector__dot" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Orientation toggle */}
        <div className="panel">
          <div className="panel__title">ORIENTATION</div>
          <div className="orientation-toggle">
            <button
              className={cx('orientation-toggle__btn', orientation === 'horizontal' && 'orientation-toggle__btn--active')}
              onClick={() => onSetOrientation('horizontal')}
            >
              HORIZONTAL
            </button>
            <button
              className={cx('orientation-toggle__btn', orientation === 'vertical' && 'orientation-toggle__btn--active')}
              onClick={() => onSetOrientation('vertical')}
            >
              VERTICAL
            </button>
          </div>
        </div>

        <button className="btn" onClick={onRandomize}>⟳ RANDOMIZE</button>

        <button className="btn btn--danger" onClick={onClearBoard}>✕ CLEAR BOARD</button>

        <button
          className="btn btn--primary"
          disabled={!allShipsPlaced}
          onClick={onBeginGame}
        >
          ► LAUNCH BATTLE
        </button>

        {/* ── Session stats — only visible after at least one game ── */}
        {sessionStats.gamesPlayed > 0 && (
          <div className="setup-session">
            <div className="setup-session__title">SESSION</div>
            <div className="setup-session__grid">
              <div className="setup-session__cell">
                <div className="setup-session__val setup-session__val--win">
                  {sessionStats.wins}
                </div>
                <div className="setup-session__key">WINS</div>
              </div>
              <div className="setup-session__cell">
                <div className="setup-session__val setup-session__val--loss">
                  {sessionStats.losses}
                </div>
                <div className="setup-session__key">LOSSES</div>
              </div>
              <div className="setup-session__cell">
                <div className="setup-session__val">
                  {wr !== null ? `${wr}%` : '—'}
                </div>
                <div className="setup-session__key">WIN RATE</div>
              </div>
              <div className="setup-session__cell">
                <div className="setup-session__val setup-session__val--best">
                  {sessionStats.bestScore !== null ? `${sessionStats.bestScore}%` : '—'}
                </div>
                <div className="setup-session__key">BEST</div>
              </div>
              <div className="setup-session__cell">
                <div className="setup-session__val">
                  {shots !== null ? shots : '—'}
                </div>
                <div className="setup-session__key">AVG SHOTS</div>
              </div>
              <div className="setup-session__cell">
                <div className="setup-session__val setup-session__val--streak">
                  {sessionStats.winStreak}
                </div>
                <div className="setup-session__key">STREAK</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}