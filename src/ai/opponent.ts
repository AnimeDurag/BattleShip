import { AIState, Board, AttackOutcome } from '../models/types';
import { BOARD_SIZE } from '../utils/constants';
import { randomInt } from '../utils/helpers';

// Creates a fresh AI state
export function createAIState(): AIState {
  return {
    mode: 'hunt',
    lastHit: null,
    targetQueue: [],
    attacked: new Set<string>(),
  };
}

// Picks a random unattacked cell using a checkerboard pattern for efficiency
function huntMove(aiState: AIState): [number, number] {
  const candidates: [number, number][] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      // Checkerboard: only attack cells where (r + c) is even
      if ((r + c) % 2 === 0 && !aiState.attacked.has(`${r},${c}`)) {
        candidates.push([r, c]);
      }
    }
  }

  // If checkerboard is exhausted, fall back to any unattacked cell
  if (candidates.length === 0) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!aiState.attacked.has(`${r},${c}`)) {
          candidates.push([r, c]);
        }
      }
    }
  }

  return candidates[randomInt(candidates.length)];
}

// Picks the next cell from the target queue (adjacent to a hit)
function targetMove(aiState: AIState): [number, number] {
  return aiState.targetQueue[0];
}

// Generates adjacent cells (up, down, left, right) within bounds
function getAdjacentCells(
  row: number,
  col: number,
  attacked: Set<string>
): [number, number][] {
  const directions: [number, number][] = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];

  return directions
    .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
    .filter(
      ([r, c]) =>
        r >= 0 &&
        r < BOARD_SIZE &&
        c >= 0 &&
        c < BOARD_SIZE &&
        !attacked.has(`${r},${c}`)
    );
}

// Returns the AI's chosen move without mutating state
export function getAIMove(aiState: AIState): [number, number] {
  if (aiState.mode === 'hunt' || aiState.targetQueue.length === 0) {
    return huntMove(aiState);
  }
  return targetMove(aiState);
}

// Updates AI state based on the outcome of its last move
export function updateAIState(
  aiState: AIState,
  row: number,
  col: number,
  outcome: AttackOutcome
): AIState {
  const key = `${row},${col}`;
  const newAttacked = new Set(aiState.attacked);
  newAttacked.add(key);

  if (outcome.result === 'miss') {
    const newQueue = aiState.targetQueue.filter(
      ([r, c]) => `${r},${c}` !== key
    );
    return {
      ...aiState,
      attacked: newAttacked,
      targetQueue: newQueue,
      mode: newQueue.length > 0 ? 'target' : 'hunt',
    };
  }

  if (outcome.result === 'sunk') {
    // Ship is destroyed — clear target queue and return to hunt mode
    return {
      mode: 'hunt',
      lastHit: null,
      targetQueue: [],
      attacked: newAttacked,
    };
  }

  if (outcome.result === 'hit') {
    // Add adjacent cells to the target queue
    const adjacent = getAdjacentCells(row, col, newAttacked);
    const existingKeys = new Set(
      aiState.targetQueue.map(([r, c]) => `${r},${c}`)
    );
    const newTargets = adjacent.filter(
      ([r, c]) => !existingKeys.has(`${r},${c}`)
    );

    return {
      mode: 'target',
      lastHit: [row, col],
      targetQueue: [...aiState.targetQueue.slice(1), ...newTargets],
      attacked: newAttacked,
    };
  }

  return { ...aiState, attacked: newAttacked };
}