import { useState, useRef, useEffect } from 'react';
import { Board } from '../models/types';
import { COLUMN_LABELS, BOARD_SIZE } from '../utils/constants';
import Cell from './Cell';

interface BoardGridProps {
  board: Board;
  isOwn: boolean;
  phase: 'setup' | 'playing' | 'gameover';
  onCellClick?: (row: number, col: number) => void;
  setupShipSize?: number;
  setupOrientation?: 'horizontal' | 'vertical';
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

export default function BoardGrid({
  board,
  isOwn,
  phase,
  onCellClick,
  setupShipSize,
  setupOrientation,
}: BoardGridProps) {
  const [hoverCell, setHoverCell]   = useState<[number, number] | null>(null);
  const [shaking, setShaking]       = useState(false);
  const [cursorCell, setCursorCell] = useState<[number, number]>([0, 0]);

  const isEnemyBoard = !isOwn && phase === 'playing';

  // Keep a ref to the latest onCellClick so the keyboard handler never
  // closes over a stale version — and never triggers setState updaters.
  const onCellClickRef = useRef(onCellClick);
  useEffect(() => { onCellClickRef.current = onCellClick; }, [onCellClick]);

  // Keep a ref to the latest cursorCell for the same reason
  const cursorCellRef = useRef(cursorCell);
  useEffect(() => { cursorCellRef.current = cursorCell; }, [cursorCell]);

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
        setCursorCell(([r, c]) => [
          Math.max(0, Math.min(BOARD_SIZE - 1, r + dr)),
          Math.max(0, Math.min(BOARD_SIZE - 1, c + dc)),
        ]);
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
    if (isSetupActive && previewCells.get(`${r},${c}`) === 'invalid') {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      return;
    }
    onCellClick(r, c);
  }

  return (
    <div className={`board-grid${shaking ? ' board-grid--shake' : ''}`}>
      <div className="board-grid__header">
        <div />
        {COLUMN_LABELS.map(label => (
          <div key={label} className="board-grid__col-label">{label}</div>
        ))}
      </div>

      {board.grid.map((row, r) => (
        <div key={r} className="board-grid__row">
          <div className="board-grid__row-label">{r + 1}</div>
          {row.map((cellState, c) => {
            const attackable = (
              isEnemyBoard     &&
              cellState !== 'hit'  &&
              cellState !== 'miss' &&
              cellState !== 'sunk'
            );

            const isFocused = isEnemyBoard &&
              cursorCell[0] === r && cursorCell[1] === c;

            return (
              <Cell
                key={c}
                state={cellState}
                isOwn={isOwn}
                attackable={attackable}
                setupClickable={isSetupActive}
                previewState={previewCells.get(`${r},${c}`) ?? null}
                focused={isFocused}
                onClick={() => handleCellClick(r, c)}
                onMouseEnter={() => {
                  setHoverCell([r, c]);
                  if (isEnemyBoard) setCursorCell([r, c]);
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