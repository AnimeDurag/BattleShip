import { Board, GameState } from '../models/types';
import { BOARD_SIZE, COLUMN_LABELS } from '../utils/constants';

// ANSI color codes for terminal output
const COLORS = {
  reset:  '\x1b[0m',
  blue:   '\x1b[34m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  gray:   '\x1b[90m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bold:   '\x1b[1m',
};

function colorize(text: string, color: string): string {
  return `${color}${text}${COLORS.reset}`;
}

// Maps a cell state to a colored symbol
function cellSymbol(
  state: string,
  revealShips: boolean
): string {
  switch (state) {
    case 'hit':   return colorize(' X ', COLORS.red);
    case 'miss':  return colorize(' ~ ', COLORS.blue);
    case 'sunk':  return colorize(' # ', COLORS.yellow);
    case 'ship':  return revealShips
                    ? colorize(' S ', COLORS.green)
                    : colorize(' . ', COLORS.gray);
    default:      return colorize(' . ', COLORS.gray);
  }
}

// Renders a single board to the terminal
function renderBoard(board: Board, revealShips: boolean): string {
  const header = '    ' + COLUMN_LABELS.map(l => ` ${l} `).join('');
  const divider = '    ' + '-'.repeat(BOARD_SIZE * 3 + 1);

  const rows = board.grid.map((row, i) => {
    const rowNum = String(i + 1).padStart(2, ' ');
    const cells = row.map(cell => cellSymbol(cell, revealShips)).join('');
    return `${rowNum} |${cells}`;
  });

  return [header, divider, ...rows].join('\n');
}

// Renders both boards side by side with labels
export function displayBoards(state: GameState): void {
  console.log('\n');
  console.log(
    colorize('  ════════════════════════════════════════════════════════════', COLORS.cyan)
  );
  console.log(
    colorize(`  ${'BATTLESHIP'.padStart(36)}`, COLORS.bold)
  );
  console.log(
    colorize('  ════════════════════════════════════════════════════════════', COLORS.cyan)
  );

  console.log('\n' + colorize('  YOUR BOARD', COLORS.green));
  console.log(renderBoard(state.playerBoard, true));

  console.log('\n' + colorize('  OPPONENT BOARD', COLORS.red));
  console.log(renderBoard(state.opponentBoard, false));
  console.log('\n');
}

// Renders only the player's own board (used during setup)
export function displayPlayerBoard(board: Board): void {
  console.log('\n' + colorize('  YOUR BOARD', COLORS.green));
  console.log(renderBoard(board, true));
  console.log();
}

// Prints a divider line
export function displayDivider(): void {
  console.log(colorize('\n  ────────────────────────────────────────\n', COLORS.gray));
}

// Prints a fleet status summary
export function displayFleetStatus(state: GameState): void {
  console.log(colorize('  FLEET STATUS', COLORS.bold));

  const playerShips = state.playerBoard.ships;
  const opponentShips = state.opponentBoard.ships;

  console.log(colorize('  Your fleet:', COLORS.green));
  playerShips.forEach(ship => {
    const status = ship.sunk
      ? colorize('SUNK', COLORS.red)
      : colorize('AFLOAT', COLORS.green);
    console.log(`    ${ship.name.padEnd(12)} [${status}]`);
  });

  console.log(colorize('  Enemy fleet:', COLORS.red));
  opponentShips.forEach(ship => {
    const status = ship.sunk
      ? colorize('SUNK', COLORS.red)
      : colorize('UNKNOWN', COLORS.gray);
    console.log(`    ${ship.name.padEnd(12)} [${status}]`);
  });

  console.log();
}

// Prints the game over banner
export function displayGameOver(state: GameState): void {
  console.log('\n');
  if (state.winner === 'player') {
    console.log(colorize('  ★ VICTORY! You sank the entire enemy fleet! ★', COLORS.yellow));
  } else {
    console.log(colorize('  ✗ DEFEAT. The enemy sank your entire fleet.', COLORS.red));
  }
  console.log(
    colorize(`  Game completed in ${state.turnCount} turns.\n`, COLORS.gray)
  );
}