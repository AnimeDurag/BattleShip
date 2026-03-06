import { FLEET } from '../utils/constants';
import { SetupState } from '../hooks/useGameState';
import { Board } from '../models/types';
import BoardGrid from './BoardGrid';

interface SetupScreenProps {
  playerBoard: Board;
  setupState: SetupState;
  allShipsPlaced: boolean;
  onSelectShip: (name: string) => void;
  onSetOrientation: (o: 'horizontal' | 'vertical') => void;
  onCellClick: (row: number, col: number) => void;
  onRandomize: () => void;
  onBeginGame: () => void;
}

export default function SetupScreen({
  playerBoard,
  setupState,
  allShipsPlaced,
  onSelectShip,
  onSetOrientation,
  onCellClick,
  onRandomize,
  onBeginGame,
}: SetupScreenProps) {
  const { placedShipNames, selectedShipName, orientation } = setupState;
  const selectedDef = FLEET.find(f => f.name === selectedShipName);

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
        />

        <p className="setup-screen__hint">
          {selectedShipName
            ? `Placing: ${selectedShipName} (${selectedDef?.size} cells) — hover to preview, click to place`
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
            const placed   = placedShipNames.includes(def.name);
            const selected = selectedShipName === def.name;
            return (
              <div
                key={def.name}
                className={[
                  'ship-selector__item',
                  selected ? 'ship-selector__item--selected' : '',
                  placed   ? 'ship-selector__item--placed'   : '',
                ].join(' ')}
                onClick={() => onSelectShip(def.name)}
              >
                <span>{def.name}</span>
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
              className={`orientation-toggle__btn${orientation === 'horizontal' ? ' orientation-toggle__btn--active' : ''}`}
              onClick={() => onSetOrientation('horizontal')}
            >
              HORIZONTAL
            </button>
            <button
              className={`orientation-toggle__btn${orientation === 'vertical' ? ' orientation-toggle__btn--active' : ''}`}
              onClick={() => onSetOrientation('vertical')}
            >
              VERTICAL
            </button>
          </div>
        </div>

        <button className="btn" onClick={onRandomize}>⟳ RANDOMIZE</button>

        <button
          className="btn btn--primary"
          disabled={!allShipsPlaced}
          onClick={onBeginGame}
        >
          ► LAUNCH BATTLE
        </button>
      </div>
    </div>
  );
}