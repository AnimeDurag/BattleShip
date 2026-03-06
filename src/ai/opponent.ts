import { AIState, AttackOutcome } from '../models/types';
import { BOARD_SIZE } from '../utils/constants';
import { randomInt } from '../utils/helpers';

// Creates a fresh AI state
export function createAIState(): AIState {
  return {
    mode:        'hunt',
    lastHit:     null,
    targetQueue: [],
    attacked:    new Set<string>(),
  };
}

// Picks a random unattacked cell using a checkerboard pattern for efficiency
function huntMove(aiState: AIState): [number, number] {
  const candidates: [number, number][] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 0 && !aiState.attacked.has(`${r},${c}`)) {
        candidates.push([r, c]);
      }
    }
  }

  // Fallback: checkerboard exhausted, use any unattacked cell
  if (candidates.length === 0) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!aiState.attacked.has(`${r},${c}`)) candidates.push([r, c]);
      }
    }
  }

  return candidates[randomInt(candidates.length)];
}

// Returns adjacent cells in a given axis direction only
function getCellsAlongAxis(
  row: number,
  col: number,
  axis: 'row' | 'col',
  attacked: Set<string>
): [number, number][] {
  const candidates: [number, number][] = axis === 'row'
    ? [[row, col - 1], [row, col + 1]]
    : [[row - 1, col], [row + 1, col]];

  return candidates.filter(
    ([r, c]) =>
      r >= 0 && r < BOARD_SIZE &&
      c >= 0 && c < BOARD_SIZE &&
      !attacked.has(`${r},${c}`)
  ) as [number, number][];
}

// Returns all four adjacent cells within bounds that haven't been attacked
function getAllAdjacentCells(
  row: number,
  col: number,
  attacked: Set<string>
): [number, number][] {
  return ([ [-1,0],[1,0],[0,-1],[0,1] ] as [number,number][])
    .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
    .filter(
      ([r, c]) =>
        r >= 0 && r < BOARD_SIZE &&
        c >= 0 && c < BOARD_SIZE &&
        !attacked.has(`${r},${c}`)
    );
}

// Determines the axis of a ship being targeted based on two known hits
function inferAxis(
  firstHit: [number, number],
  secondHit: [number, number]
): 'row' | 'col' {
  return firstHit[0] === secondHit[0] ? 'row' : 'col';
}

export function getAIMove(aiState: AIState): [number, number] {
  if (aiState.mode === 'hunt' || aiState.targetQueue.length === 0) {
    return huntMove(aiState);
  }
  return aiState.targetQueue[0];
}

export function updateAIState(
  aiState: AIState,
  row: number,
  col: number,
  outcome: AttackOutcome
): AIState {
  const newAttacked = new Set(aiState.attacked);
  newAttacked.add(`${row},${col}`);

  // ── Sunk: ship destroyed, return to hunt mode ──────────────────────────────
  if (outcome.result === 'sunk') {
    return {
      mode:        'hunt',
      lastHit:     null,
      targetQueue: [],
      attacked:    newAttacked,
    };
  }

  // ── Miss: remove this cell from queue, downgrade mode if queue is empty ────
  if (outcome.result === 'miss') {
    const newQueue = aiState.targetQueue.filter(
      ([r, c]) => !(r === row && c === col)
    );
    return {
      ...aiState,
      attacked:    newAttacked,
      targetQueue: newQueue,
      mode:        newQueue.length > 0 ? 'target' : 'hunt',
    };
  }

  // ── Hit ────────────────────────────────────────────────────────────────────
  if (outcome.result === 'hit') {
    // If we have a previous hit, we now know the ship's axis — prune the
    // target queue to only cells along that axis, discarding perpendicular
    // candidates that were speculatively added on the first hit.
    if (aiState.lastHit) {
      const axis      = inferAxis(aiState.lastHit, [row, col]);
      const axialNext = getCellsAlongAxis(row, col, axis, newAttacked)
        .filter(([r, c]) => {
          const existingKeys = new Set(aiState.targetQueue.map(([r,c]) => `${r},${c}`));
          return !existingKeys.has(`${r},${c}`);
        });

      // Keep only same-axis cells from the existing queue plus new axial cells
      const prunedQueue = aiState.targetQueue
        .filter(([r, c]) => {
          if (axis === 'row') return r === row;
          return c === col;
        })
        .filter(([r, c]) => !newAttacked.has(`${r},${c}`));

      const deduped = [...prunedQueue];
      axialNext.forEach(([r, c]) => {
        if (!deduped.some(([er, ec]) => er === r && ec === c)) {
          deduped.push([r, c]);
        }
      });

      return {
        mode:        'target',
        lastHit:     [row, col],
        targetQueue: deduped,
        attacked:    newAttacked,
      };
    }

    // First hit on a new ship — add all four adjacent cells speculatively
    const adjacent = getAllAdjacentCells(row, col, newAttacked);
    const existingKeys = new Set(aiState.targetQueue.map(([r,c]) => `${r},${c}`));
    const newTargets = adjacent.filter(([r,c]) => !existingKeys.has(`${r},${c}`));

    return {
      mode:        'target',
      lastHit:     [row, col],
      targetQueue: [...aiState.targetQueue.slice(1), ...newTargets],
      attacked:    newAttacked,
    };
  }

  return { ...aiState, attacked: newAttacked };
}