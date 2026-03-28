export type CellState   = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';
export type Orientation = 'horizontal' | 'vertical';
export type GamePhase   = 'setup' | 'playing' | 'gameover';
export type AttackResult = 'hit' | 'miss' | 'sunk' | 'already-attacked';

// The four difficulty tiers available to the player.
export type Difficulty = 'easy' | 'medium' | 'hard' | 'sweaty';

export interface AIConfig {
  difficulty: Difficulty;
}

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

// ─── Attack outcome — discriminated union ────────────────────────────────────
//
// ship is structurally required for 'hit' and 'sunk' results.
// useGameState can access outcome.ship.name after narrowing on
// outcome.result without any non-null assertion.

export type AttackOutcome =
  | { result: 'miss' | 'already-attacked' }
  | { result: 'hit' | 'sunk'; ship: Ship };

// Relaxed variant used by the AI layer (updateAIState / opponent.ts).
// ship is optional on 'sunk' so that unit tests can pass bare
// { result: 'sunk' } outcomes without constructing a full Ship object.
// AttackOutcome is assignable to AIAttackOutcome — strict satisfies loose.

export type AIAttackOutcome =
  | { result: 'miss' | 'already-attacked' }
  | { result: 'hit'; ship?: Ship }
  | { result: 'sunk'; ship?: Ship };

// ─── Game state ───────────────────────────────────────────────────────────────

export interface GameState {
  phase: GamePhase;
  playerBoard: Board;
  opponentBoard: Board;
  currentTurn: 'player' | 'opponent';
  winner: 'player' | 'opponent' | null;
  // shotCount tracks only the player's fired shots, so calcScore receives the
  // value it was calibrated against (MIN_SHOTS_TO_WIN = 17).  AI moves are not
  // included.
  shotCount: number;
  // turnCount tracks every valid move by either side — used for the header
  // counter and integration tests that verify player-only scoring is correct.
  turnCount: number;
}

// ─── AI state ────────────────────────────────────────────────────────────────

export interface AIState {
  mode: 'hunt' | 'target';
  firstHit: [number, number] | null;  // origin cell of the ship currently being targeted
  lastHit:  [number, number] | null;  // most recent hit, used to infer axis
  targetQueue: [number, number][];
  attacked: Set<string>;
  // ── Option 3: unresolved-hit tracking ──────────────────────────────────────
  // hitCells accumulates every cell that returned 'hit' (not yet sunk).
  // resolvedHits accumulates every cell of every ship that has been sunk.
  // unresolvedHits = hitCells − resolvedHits: confirmed hits on still-living ships.
  // After any sunk event, if unresolvedHits is non-empty the AI re-enters
  // target mode seeded from those cells rather than reverting to hunt.
  hitCells:     Set<string>;
  resolvedHits: Set<string>;
  // ───────────────────────────────────────────────────────────────────────────
  config: AIConfig;                   // immutable difficulty config for this session
  remainingShipSizes: number[];       // sizes of unsunk ships; updated on sunk outcomes
}