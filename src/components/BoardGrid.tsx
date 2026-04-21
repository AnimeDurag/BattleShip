import { useState, useRef, useEffect } from 'react';
import { Board } from '../models/types';
import { COLUMN_LABELS, BOARD_SIZE } from '../utils/constants';
import type { Ship } from '../models/types';
import Cell from './Cell';

interface BoardGridProps {
  board: Board;
  isOwn: boolean;
  phase: 'setup' | 'playing' | 'gameover';
  onCellClick?: (row: number, col: number) => void;
  setupShipSize?: number;
  setupOrientation?: 'horizontal' | 'vertical';
  onRotate?: () => void;          // setup: R key toggles orientation
  revealShips?: boolean;          // gameover: show hidden enemy ship positions
  difficultyChosen?: boolean;     // false while difficulty overlay is active — disables setup kb nav
  hideLabels?: boolean;           // suppresses row + column label rendering (mini board on mobile)
  boardRole?: 'grid' | 'img';    // 'img' for non-interactive display-only boards (e.g. mini own board)
}

function previewShipCells(
  size: number,
  row: number,
  col: number,
  orientation: 'horizontal' | 'vertical'
): [number, number][] {
  return Array.from({ length: size }, (_, i) =>
    orientation === 'horizontal'
      ? [row, col + i]
      : [row + i, col]
  ) as [number, number][];
}

// Returns the name of the ship occupying [r,c], or undefined if none.
function shipAtCell(ships: Ship[], r: number, c: number): string | undefined {
  return ships.find(s => s.cells.some(([sr, sc]) => sr === r && sc === c))?.name;
}

export default function BoardGrid({
  board,
  isOwn,
  phase,
  onCellClick,
  setupShipSize,
  setupOrientation,
  onRotate,
  revealShips = false,
  difficultyChosen = true,
  hideLabels = false,
  boardRole = 'grid',
}: BoardGridProps) {
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [shaking, setShaking]     = useState(false);
  // mouseActive tracks whether the mouse is controlling hover. When keyboard
  // moves the cursor, we take over hoverCell to drive the preview. When the
  // mouse enters a cell, it retakes control.
  // mouseActiveRef: true when mouse last controlled hover/cursor.
  // Used by both setup (preview) and enemy board (attack highlight).
  const mouseActiveRef = useRef(false);

  // enemyKbMode: true when keyboard last moved the enemy-board cursor.
  // Suppresses cell--attackable on non-cursor cells so only one cell is
  // highlighted at a time (no simultaneous CSS :hover + cell--focused).
  const [enemyKbMode, setEnemyKbMode] = useState(false);
  const setEnemyKbModeRef = useRef(setEnemyKbMode);

  // cursorCell lives in a ref so its position survives parent re-renders
  // (e.g. after the AI takes its turn and React updates game state).
  // A separate counter state is incremented only when the cursor actually
  // moves, giving React a reason to re-render and reflect the new position.
  const cursorCellRef  = useRef<[number, number]>([0, 0]);
  const [, setCursorTick] = useState(0);

  // Require onCellClick: when undefined (AI thinking, gameover, reveal)
  // the board is locked — no keyboard, no cursor highlight.
  const isEnemyBoard = !isOwn && phase === 'playing' && !!onCellClick;

  // Helper that updates the ref and triggers exactly one re-render
  function moveCursor(r: number, c: number) {
    cursorCellRef.current = [r, c];
    setCursorTick(t => t + 1);
  }

  // Keep a ref to the latest onCellClick so the keyboard handler never
  // closes over a stale version — and never triggers setState updaters.
  const onCellClickRef = useRef(onCellClick);
  useEffect(() => { onCellClickRef.current = onCellClick; }, [onCellClick]);

  const onRotateRef     = useRef(onRotate);
  useEffect(() => { onRotateRef.current = onRotate; }, [onRotate]);

  const setHoverCellRef    = useRef(setHoverCell);
  // setHoverCell is stable (useState setter) so the ref never needs updating

  // handleCellClick is declared below — ref updated after each render so the
  // setup keyboard handler always gets the version with fresh board state.
  const handleCellClickRef = useRef<(r: number, c: number) => void>(() => {});

  // ── Keyboard navigation on enemy board ──────────────────────────────────

  useEffect(() => {
    if (!isEnemyBoard) return;

    function handleKey(e: KeyboardEvent) {
      const moves: Record<string, [number, number]> = {
        ArrowUp:    [-1,  0],
        ArrowDown:  [ 1,  0],
        ArrowLeft:  [ 0, -1],
        ArrowRight: [ 0,  1],
      };

      if (moves[e.key]) {
        e.preventDefault();
        const [dr, dc] = moves[e.key];
        const [r, c]   = cursorCellRef.current;
        // Keyboard takes over: suppress mouse hover highlight
        mouseActiveRef.current = false;
        setEnemyKbModeRef.current(true);
        moveCursor(
          Math.max(0, Math.min(BOARD_SIZE - 1, r + dr)),
          Math.max(0, Math.min(BOARD_SIZE - 1, c + dc)),
        );
        return;
      }

      // Fire using the ref — never inside a setState updater
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const [r, c] = cursorCellRef.current;
        onCellClickRef.current?.(r, c);
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isEnemyBoard]);


  // ── Keyboard navigation in setup phase ──────────────────────────────────

  // Keyboard nav disabled when difficulty overlay is active (difficultyChosen=false)
  const isSetupKeyboard = phase === 'setup' && isOwn && !!onCellClick && difficultyChosen;

  useEffect(() => {
    if (!isSetupKeyboard) return;

    function handleKey(e: KeyboardEvent) {
      const moves: Record<string, [number, number]> = {
        ArrowUp:    [-1,  0],
        ArrowDown:  [ 1,  0],
        ArrowLeft:  [ 0, -1],
        ArrowRight: [ 0,  1],
      };

      if (moves[e.key]) {
        e.preventDefault();
        const [dr, dc] = moves[e.key];
        const [r, c]   = cursorCellRef.current;
        const nextR    = Math.max(0, Math.min(BOARD_SIZE - 1, r + dr));
        const nextC    = Math.max(0, Math.min(BOARD_SIZE - 1, c + dc));
        moveCursor(nextR, nextC);
        // Sync hover preview to keyboard cursor position so ship ghost follows
        mouseActiveRef.current = false;
        setHoverCellRef.current([nextR, nextC]);
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const [r, c] = cursorCellRef.current;
        handleCellClickRef.current(r, c);
        return;
      }

      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onRotateRef.current?.();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSetupKeyboard]);

  // ── Setup preview cells ──────────────────────────────────────────────────

  const previewCells = new Map<string, 'valid' | 'invalid'>();

  if (phase === 'setup' && isOwn && setupShipSize && setupOrientation && hoverCell) {
    const [hRow, hCol] = hoverCell;
    const cells        = previewShipCells(setupShipSize, hRow, hCol, setupOrientation);
    const outOfBounds  = cells.some(([r, c]) => r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE);
    const collision    = !outOfBounds && cells.some(([r, c]) => board.grid[r][c] !== 'empty');
    const state        = outOfBounds || collision ? 'invalid' : 'valid';
    cells.forEach(([r, c]) => previewCells.set(`${r},${c}`, state));
  }

  const isSetupActive = phase === 'setup' && isOwn && !!setupShipSize;

  // ── Click handler — triggers shake on invalid placement ─────────────────

  function handleCellClick(r: number, c: number) {
    if (!onCellClick) return;
    if (isSetupActive && setupShipSize && setupOrientation) {
      // Recompute validity inline so shake triggers even without a prior hover
      const cells       = previewShipCells(setupShipSize, r, c, setupOrientation);
      const outOfBounds = cells.some(([cr, cc]) => cr < 0 || cr >= BOARD_SIZE || cc < 0 || cc >= BOARD_SIZE);
      const collision   = !outOfBounds && cells.some(([cr, cc]) => board.grid[cr][cc] !== 'empty');
      if (outOfBounds || collision) {
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        return;
      }
    }
    onCellClick(r, c);
  }

  // Keep ref in sync so setup keyboard handler calls the freshest version
  handleCellClickRef.current = handleCellClick;

  const [cursorRow, cursorCol] = cursorCellRef.current;

  const gridAriaLabel = boardRole === 'img'
    ? 'Your fleet status'
    : isOwn
      ? (phase === 'setup' ? 'Deploy your fleet — place ships on the grid' : 'Your fleet — shows where enemy has fired')
      : 'Enemy waters — click to fire';

  return (
    <div
      role={boardRole}
      aria-label={gridAriaLabel}
      aria-live={boardRole === 'grid' && !isOwn && phase === 'playing' ? 'polite' : undefined}
      aria-atomic={boardRole === 'grid' && !isOwn && phase === 'playing' ? 'false' : undefined}
      className={`board-grid${shaking ? ' board-grid--shake' : ''}`}
    >
      {!hideLabels && (
        <div className="board-grid__header">
          <div />
          {COLUMN_LABELS.map(label => (
            <div key={label} className="board-grid__col-label">{label}</div>
          ))}
        </div>
      )}

      {board.grid.map((row, r) => (
        <div key={r} className="board-grid__row">
          {!hideLabels && <div className="board-grid__row-label">{r + 1}</div>}
          {row.map((cellState, c) => {
            // When keyboard is active on the enemy board, restrict 'attackable'
            // to the cursor cell only — this prevents the CSS :hover highlight
            // appearing on a different cell than the keyboard cursor.
            const enemyCursorCell = isEnemyBoard && enemyKbMode
              ? cursorRow === r && cursorCol === c
              : true;
            const attackable = (
              !!onCellClick    &&
              isEnemyBoard     &&
              enemyCursorCell  &&
              cellState !== 'hit'  &&
              cellState !== 'miss' &&
              cellState !== 'sunk'
            );

            const isFocused = (isEnemyBoard || isSetupKeyboard) && cursorRow === r && cursorCol === c;

            // When revealShips=true expose unsunk enemy ship cells.
            // placeShip marks grid cells as 'ship', not 'empty', so we match
            // on 'ship' state — these cells are simply hidden from the player
            // normally because isOwn=false suppresses the ship CSS class.
            const isRevealedShip = revealShips && !isOwn && cellState === 'ship';

            const effectiveName = shipAtCell(board.ships, r, c);
            const effectiveState = isRevealedShip ? 'ship' : cellState;

            const isAlreadyAttacked = !isOwn && phase === 'playing' &&
              (cellState === 'hit' || cellState === 'miss' || cellState === 'sunk');

            return (
              <Cell
                key={c}
                state={effectiveState}
                isOwn={isOwn || isRevealedShip}
                attackable={attackable}
                setupClickable={isSetupActive}
                previewState={previewCells.get(`${r},${c}`) ?? null}
                focused={isFocused}
                shipName={effectiveState === 'ship' ? effectiveName : undefined}
                col={COLUMN_LABELS[c]}
                row={r + 1}
                ariaDisabled={isAlreadyAttacked && !attackable ? true : undefined}
                onClick={() => handleCellClick(r, c)}
                onMouseEnter={() => {
                  mouseActiveRef.current = true;
                  setHoverCell([r, c]);
                  if (isEnemyBoard) {
                    // Mouse retakes control: clear keyboard mode and sync cursor
                    setEnemyKbMode(false);
                    moveCursor(r, c);
                  }
                  // Setup mode: sync keyboard cursor to mouse position
                  if (isSetupKeyboard) moveCursor(r, c);
                }}
                onMouseLeave={() => setHoverCell(null)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}