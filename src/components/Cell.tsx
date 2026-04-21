import { CellState } from '../models/types';

interface CellProps {
  state: CellState;
  isOwn: boolean;
  attackable?: boolean;
  setupClickable?: boolean;
  focused?: boolean;
  previewState?: 'valid' | 'invalid' | null;
  shipName?: string;           // name of the ship occupying this cell — drives color
  col?: string;                // column label e.g. 'A' — used for aria-label
  row?: number;                // row number e.g. 1 — used for aria-label
  ariaDisabled?: boolean;      // true for already-attacked enemy cells
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const MARKERS: Partial<Record<CellState, string>> = {
  hit:  '✕',
  sunk: '✕',
  miss: '·',
};

export function cellAriaLabel(col: string, row: number, state: CellState, isOwn: boolean): string {
  const coord = `${col}${row}`;
  if (isOwn) {
    if (state === 'hit')  return `${coord} — your ship was hit here`;
    if (state === 'miss') return `${coord} — enemy missed here`;
    if (state === 'sunk') return `${coord} — your ship was sunk`;
    return `${coord}`;
  }
  if (state === 'hit')  return `${coord} — hit`;
  if (state === 'miss') return `${coord} — missed`;
  if (state === 'sunk') return `${coord} — sunk`;
  return `${coord} — fire here`;
}

export default function Cell({
  state,
  isOwn,
  attackable     = false,
  setupClickable = false,
  focused        = false,
  previewState   = null,
  shipName,
  col,
  row,
  ariaDisabled,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CellProps) {

  // ── Class composition ──────────────────────────────────────────────────────

  const classes = ['cell'];

  if (previewState === 'valid')        classes.push('cell--preview-valid');
  else if (previewState === 'invalid') classes.push('cell--preview-invalid');
  else {
    if (state === 'ship' && isOwn) {
      classes.push('cell--ship');
      if (shipName) classes.push(`cell--ship-${shipName.toLowerCase()}`);
    }
    if (state === 'hit')           classes.push('cell--hit');
    if (state === 'miss')          classes.push('cell--miss');
    if (state === 'sunk')          classes.push('cell--sunk');
  }

  if (attackable || setupClickable) classes.push('cell--attackable');
  if (focused)                      classes.push('cell--focused');

  // ── Marker ─────────────────────────────────────────────────────────────────

  const marker = MARKERS[state] ?? (state === 'ship' && isOwn ? '■' : null);

  const handleClick = (attackable || setupClickable) ? onClick : undefined;

  const computedAriaLabel = col && row != null
    ? cellAriaLabel(col, row, state, isOwn)
    : (attackable ? 'Attack cell' : setupClickable ? 'Place ship' : undefined);

  return (
    <div
      className={classes.join(' ')}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role={(attackable || setupClickable) ? 'button' : undefined}
      aria-label={computedAriaLabel}
      aria-disabled={ariaDisabled || undefined}
    >
      {marker && <span className="cell__marker">{marker}</span>}
    </div>
  );
}
