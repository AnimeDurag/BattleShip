import { FLEET, SHIP_COLOR_VARS } from '../utils/constants';
import { cx } from '../utils/helpers';
import { SetupState } from '../hooks/useGameState';
import type { SessionStats } from '../hooks/useSessionStats';
import { Board } from '../models/types';
import BoardGrid from './BoardGrid';

interface MobileSetupScreenProps {
  playerBoard:      Board;
  setupState:       SetupState;
  allShipsPlaced:   boolean;
  sessionStats:     SessionStats;
  onSelectShip:     (name: string) => void;
  onSetOrientation: (o: 'horizontal' | 'vertical') => void;
  onCellClick:      (row: number, col: number) => void;
  onRandomize:      () => void;
  onClearBoard:     () => void;
  onBeginGame:      () => void;
  difficultyChosen?: boolean;
  playerLabel?:     string;
}

export default function MobileSetupScreen({
  playerBoard,
  setupState,
  allShipsPlaced,
  onSelectShip,
  onSetOrientation,
  onCellClick,
  onRandomize,
  onClearBoard,
  onBeginGame,
  difficultyChosen = true,
  playerLabel,
}: MobileSetupScreenProps) {
  const { placedShipNames, selectedShipName, orientation } = setupState;
  const selectedDef = FLEET.find(f => f.name === selectedShipName);

  return (
    <div className="mobile-setup-screen">
      {/* Board — full width, primary interaction surface */}
      <div className="mobile-setup-screen__board">
        <div className="board-label">
          {playerLabel ? `DEPLOY YOUR FLEET — ${playerLabel}` : 'DEPLOY YOUR FLEET'}
        </div>
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
      </div>

      {/* Horizontal scrollable ship selector */}
      <div className="mobile-setup-screen__ships">
        {FLEET.map(def => {
          const placed   = placedShipNames.includes(def.name);
          const selected = selectedShipName === def.name;
          const colorVar = SHIP_COLOR_VARS[def.name];
          return (
            <div
              key={def.name}
              className={cx(
                'ship-selector__item',
                'mobile-setup-screen__ship-item',
                selected && 'ship-selector__item--selected',
                placed   && 'ship-selector__item--placed',
              )}
              style={{ '--item-ship-color': `var(${colorVar})` } as React.CSSProperties}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${def.name}, ${def.size} cells${placed ? ', placed' : ''}`}
              onClick={() => onSelectShip(def.name)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectShip(def.name);
                }
              }}
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

      {/* Orientation toggle — two full-width buttons */}
      <div
        className="mobile-setup-screen__orientation"
        role="group"
        aria-label="Ship orientation"
      >
        <button
          className={cx('orientation-toggle__btn', orientation === 'horizontal' && 'orientation-toggle__btn--active')}
          aria-pressed={orientation === 'horizontal'}
          onClick={() => onSetOrientation('horizontal')}
        >
          HORIZONTAL
        </button>
        <button
          className={cx('orientation-toggle__btn', orientation === 'vertical' && 'orientation-toggle__btn--active')}
          aria-pressed={orientation === 'vertical'}
          onClick={() => onSetOrientation('vertical')}
        >
          VERTICAL
        </button>
      </div>

      {/* Action buttons — 3-column row */}
      <div className="mobile-setup-screen__actions">
        <button className="btn" onClick={onRandomize}>⟳ RANDOMIZE</button>
        <button className="btn btn--danger" onClick={onClearBoard}>✕ CLEAR BOARD</button>
        <button
          className={`btn${allShipsPlaced ? ' btn--ready' : ''}`}
          disabled={!allShipsPlaced}
          onClick={onBeginGame}
        >
          ► LAUNCH BATTLE
        </button>
      </div>
    </div>
  );
}
