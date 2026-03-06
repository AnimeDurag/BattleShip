export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';
export type Orientation = 'horizontal' | 'vertical';
export type GamePhase = 'setup' | 'playing' | 'gameover';
export type AttackResult = 'hit' | 'miss' | 'sunk' | 'already-attacked';

export interface Ship {
  id: string;
  name: string;
  size: number;
  cells: [number, number][];   // [row, col] pairs this ship occupies
  hits: Set<string>;           // "row,col" strings of cells that have been hit
  sunk: boolean;
}

export interface Board {
  grid: CellState[][];         // 10x10 grid of cell states
  ships: Ship[];
}

export interface AttackOutcome {
  result: AttackResult;
  ship?: Ship;                 // populated when result is 'hit' or 'sunk'
}

export interface GameState {
  phase: GamePhase;
  playerBoard: Board;
  opponentBoard: Board;
  currentTurn: 'player' | 'opponent';
  winner: 'player' | 'opponent' | null;
  turnCount: number;
}

export interface AIState {
  mode: 'hunt' | 'target';
  lastHit: [number, number] | null;
  targetQueue: [number, number][];
  attacked: Set<string>;
}