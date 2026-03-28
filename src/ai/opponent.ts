import { AIState, AIConfig, AIAttackOutcome } from '../models/types'; // AIAttackOutcome allows bare sunk in tests
import { BOARD_SIZE, DEFAULT_DIFFICULTY, FLEET } from '../utils/constants';
import { randomInt } from '../utils/helpers';

function assertNever(x: never): never {
  throw new Error(`Unhandled AttackResult: ${x}`);
}

export function createAIState(config?: AIConfig): AIState {
  return {
    mode:               'hunt',
    firstHit:           null,
    lastHit:            null,
    targetQueue:        [],
    attacked:           new Set<string>(),
    hitCells:           new Set<string>(),
    resolvedHits:       new Set<string>(),
    config:             config ?? { difficulty: DEFAULT_DIFFICULTY },
    remainingShipSizes: FLEET.map(f => f.size),
  };
}

// ─── Hunt strategies ──────────────────────────────────────────────────────────

function easyHuntMove(attacked: Set<string>): [number, number] {
  const candidates: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (!attacked.has(`${r},${c}`)) candidates.push([r, c]);
  return candidates[randomInt(candidates.length)];
}

function mediumHuntMove(attacked: Set<string>): [number, number] {
  const candidates: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if ((r + c) % 2 === 0 && !attacked.has(`${r},${c}`)) candidates.push([r, c]);
  if (candidates.length === 0)
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (!attacked.has(`${r},${c}`)) candidates.push([r, c]);
  return candidates[randomInt(candidates.length)];
}

export function buildDensityGrid(
  shipSize: number,
  attacked: Set<string>
): number[][] {
  const grid: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    new Array(BOARD_SIZE).fill(0)
  );
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (c + shipSize <= BOARD_SIZE) {
        let valid = true;
        for (let i = 0; i < shipSize && valid; i++)
          if (attacked.has(`${r},${c + i}`)) valid = false;
        if (valid) for (let i = 0; i < shipSize; i++) grid[r][c + i]++;
      }
      if (r + shipSize <= BOARD_SIZE) {
        let valid = true;
        for (let i = 0; i < shipSize && valid; i++)
          if (attacked.has(`${r + i},${c}`)) valid = false;
        if (valid) for (let i = 0; i < shipSize; i++) grid[r + i][c]++;
      }
    }
  }
  return grid;
}

function hardHuntMove(attacked: Set<string>, remainingShipSizes: number[]): [number, number] {
  const largestSize = remainingShipSizes.length > 0 ? Math.max(...remainingShipSizes) : 1;
  const density = buildDensityGrid(largestSize, attacked);
  let best = -1;
  const top: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (attacked.has(`${r},${c}`)) continue;
      const score = density[r][c];
      if      (score > best)  { best = score; top.length = 0; top.push([r, c]); }
      else if (score === best) { top.push([r, c]); }
    }
  }
  if (top.length === 0) return easyHuntMove(attacked);
  return top[randomInt(top.length)];
}

export function buildCombinedDensityGrid(
  remainingShipSizes: number[],
  attacked: Set<string>
): number[][] {
  const combined: number[][] = Array.from({ length: BOARD_SIZE }, () =>
    new Array(BOARD_SIZE).fill(0)
  );
  const uniqueSizes = [...new Set(remainingShipSizes)];
  for (const size of uniqueSizes) {
    const d = buildDensityGrid(size, attacked);
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        combined[r][c] += d[r][c];
  }
  return combined;
}

function sweatyHuntMove(attacked: Set<string>, remainingShipSizes: number[]): [number, number] {
  if (remainingShipSizes.length === 0) return easyHuntMove(attacked);
  const density = buildCombinedDensityGrid(remainingShipSizes, attacked);
  let best = -1;
  const top: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (attacked.has(`${r},${c}`)) continue;
      const score = density[r][c];
      if      (score > best)  { best = score; top.length = 0; top.push([r, c]); }
      else if (score === best) { top.push([r, c]); }
    }
  }
  if (top.length === 0) return easyHuntMove(attacked);
  return top[randomInt(top.length)];
}

// ─── Shared target-mode helpers ───────────────────────────────────────────────

function getCellsAlongAxis(
  row: number, col: number, axis: 'row' | 'col', attacked: Set<string>
): [number, number][] {
  const candidates: [number, number][] = axis === 'row'
    ? [[row, col - 1], [row, col + 1]]
    : [[row - 1, col], [row + 1, col]];
  return candidates.filter(
    ([r, c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && !attacked.has(`${r},${c}`)
  ) as [number, number][];
}

function getAllAdjacentCells(row: number, col: number, attacked: Set<string>): [number, number][] {
  return ([ [-1,0],[1,0],[0,-1],[0,1] ] as [number,number][])
    .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
    .filter(([r, c]) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && !attacked.has(`${r},${c}`));
}

function inferAxis(firstHit: [number, number], secondHit: [number, number]): 'row' | 'col' {
  return firstHit[0] === secondHit[0] ? 'row' : 'col';
}

// ─── Option 3: unresolved-hit tracking ───────────────────────────────────────
//
// Scans hitCells − resolvedHits for any confirmed hit on a still-living ship
// that has at least one unattacked adjacent cell to probe.
//
// Priority:
//   1. firstHit (if it is still unresolved) — keeps the current targeting context
//   2. Any other unresolved hit with available adjacents
//
// Returns the seed cell + its ready-to-use adjacent queue, or null if nothing
// actionable is found (all unresolved hits are completely surrounded).
//
// Exported for unit testing.
export function findUnresolvedSeed(
  hitCells:     Set<string>,
  resolvedHits: Set<string>,
  firstHit:     [number, number] | null,
  newAttacked:  Set<string>
): { cell: [number, number]; adjacents: [number, number][] } | null {
  // Helper: check a single key and return its seed if actionable
  const tryCell = (key: string): { cell: [number, number]; adjacents: [number, number][] } | null => {
    if (!hitCells.has(key) || resolvedHits.has(key)) return null;
    const [r, c] = key.split(',').map(Number) as [number, number];
    const adjacents = getAllAdjacentCells(r, c, newAttacked);
    return adjacents.length > 0 ? { cell: [r, c], adjacents } : null;
  };

  // Prefer the current firstHit for continuity
  if (firstHit) {
    const result = tryCell(`${firstHit[0]},${firstHit[1]}`);
    if (result) return result;
  }

  // Scan all other unresolved hits
  for (const key of hitCells) {
    if (firstHit && key === `${firstHit[0]},${firstHit[1]}`) continue; // already tried
    const result = tryCell(key);
    if (result) return result;
  }

  return null;
}

// ─── Public move selector ─────────────────────────────────────────────────────

export function getAIMove(aiState: AIState): [number, number] {
  const { mode, targetQueue, attacked, config, remainingShipSizes } = aiState;
  if (config.difficulty === 'easy') return easyHuntMove(attacked);
  if (mode === 'target' && targetQueue.length > 0) return targetQueue[0];
  switch (config.difficulty) {
    case 'medium': return mediumHuntMove(attacked);
    case 'hard':   return hardHuntMove(attacked, remainingShipSizes);
    case 'sweaty': return sweatyHuntMove(attacked, remainingShipSizes);
  }
}

// ─── updateAIState helpers ────────────────────────────────────────────────────

export function recordAttack(aiState: AIState, row: number, col: number): Set<string> {
  const next = new Set(aiState.attacked);
  next.add(`${row},${col}`);
  return next;
}

export function mergeUnique(
  base: [number, number][],
  additions: [number, number][]
): [number, number][] {
  const result = [...base];
  const seen   = new Set(base.map(([r, c]) => `${r},${c}`));
  for (const [r, c] of additions) {
    if (!seen.has(`${r},${c}`)) { result.push([r, c]); seen.add(`${r},${c}`); }
  }
  return result;
}

// Handles a sunk outcome.
//
// Option 3 — unresolved-hit recovery:
//   When sunkCells is provided we add them to resolvedHits and then compute
//   unresolvedHits = hitCells − resolvedHits.  If any remain the AI re-enters
//   target mode seeded from those cells instead of reverting to hunt.
//   This handles BOTH directions of the adjacency problem:
//     • firstHit NOT on sunk ship → firstHit is still unresolved → resume it
//     • firstHit IS on sunk ship  → any other hit cell is unresolved → resume it
//   Without sunkCells (test stubs) we skip the scan and fall through to hunt,
//   preserving backward compatibility with unit tests that use empty-cell ships.
export function handleSunk(
  aiState: AIState,
  newAttacked: Set<string>,
  sunkSize?: number,
  sunkCells?: [number, number][]
): AIState {
  // Update remainingShipSizes
  let newRemaining = aiState.remainingShipSizes;
  if (sunkSize !== undefined) {
    const idx = newRemaining.indexOf(sunkSize);
    if (idx !== -1)
      newRemaining = [...newRemaining.slice(0, idx), ...newRemaining.slice(idx + 1)];
  }

  // Incorporate sunk ship cells into resolvedHits
  const newResolvedHits = new Set(aiState.resolvedHits);
  if (sunkCells && sunkCells.length > 0) {
    for (const [r, c] of sunkCells) newResolvedHits.add(`${r},${c}`);

    // Option 3 scan — only for non-easy difficulties, only when we know the cells
    if (aiState.config.difficulty !== 'easy') {
      const seed = findUnresolvedSeed(
        aiState.hitCells, newResolvedHits, aiState.firstHit, newAttacked
      );
      if (seed) {
        return {
          mode:               'target',
          firstHit:           seed.cell,
          lastHit:            seed.cell,
          targetQueue:        seed.adjacents,
          attacked:           newAttacked,
          hitCells:           aiState.hitCells,
          resolvedHits:       newResolvedHits,
          config:             aiState.config,
          remainingShipSizes: newRemaining,
        };
      }
    }
  }

  return {
    mode:               'hunt',
    firstHit:           null,
    lastHit:            null,
    targetQueue:        [],
    attacked:           newAttacked,
    hitCells:           aiState.hitCells,
    resolvedHits:       newResolvedHits,
    config:             aiState.config,
    remainingShipSizes: newRemaining,
  };
}

// Handles a miss. Easy always stays in hunt mode.
// Medium/hard/sweaty: backtrack-recover if the queue empties with a live hit.
// Last resort before reverting to hunt: Option 3 scan for any other unresolved hit.
export function handleMiss(
  aiState: AIState,
  row: number,
  col: number,
  newAttacked: Set<string>
): AIState {
  if (aiState.config.difficulty === 'easy') {
    return { ...aiState, attacked: newAttacked };
  }

  const newQueue = aiState.targetQueue.filter(([r, c]) => !(r === row && c === col));

  // Queue still has candidates — stay in target mode
  if (newQueue.length > 0) {
    return { ...aiState, attacked: newAttacked, targetQueue: newQueue, mode: 'target' };
  }

  // Queue exhausted. If firstHit is still live, backtrack and re-seed from it.
  if (aiState.firstHit) {
    const [fr, fc] = aiState.firstHit;
    const recovery = getAllAdjacentCells(fr, fc, newAttacked);
    if (recovery.length > 0) {
      return {
        ...aiState,
        attacked:    newAttacked,
        targetQueue: recovery,
        lastHit:     aiState.firstHit,
        mode:        'target',
      };
    }
  }

  // Queue and firstHit backtrack exhausted. Option 3: check for unresolved hits
  // on other ships before giving up and reverting to hunt.
  const seed = findUnresolvedSeed(
    aiState.hitCells, aiState.resolvedHits, aiState.firstHit, newAttacked
  );
  if (seed) {
    return {
      ...aiState,
      attacked:    newAttacked,
      firstHit:    seed.cell,
      lastHit:     seed.cell,
      targetQueue: seed.adjacents,
      mode:        'target',
    };
  }

  // Nothing left — revert fully to hunt mode.
  return {
    ...aiState,
    attacked:    newAttacked,
    targetQueue: [],
    mode:        'hunt',
    lastHit:     null,
    firstHit:    null,
  };
}

// Handles the first hit on a new ship. Easy ignores hits.
// Records the hit cell in hitCells for Option 3 tracking.
export function handleFirstHit(
  aiState: AIState,
  row: number,
  col: number,
  newAttacked: Set<string>
): AIState {
  if (aiState.config.difficulty === 'easy') {
    return { ...aiState, attacked: newAttacked };
  }

  const newHitCells = new Set(aiState.hitCells);
  newHitCells.add(`${row},${col}`);

  const adjacent   = getAllAdjacentCells(row, col, newAttacked);
  const newTargets = adjacent.filter(
    ([r, c]) => !aiState.targetQueue.some(([er, ec]) => er === r && ec === c)
  );
  return {
    mode:               'target',
    firstHit:           [row, col],
    lastHit:            [row, col],
    targetQueue:        [...aiState.targetQueue, ...newTargets],
    attacked:           newAttacked,
    hitCells:           newHitCells,
    resolvedHits:       aiState.resolvedHits,
    config:             aiState.config,
    remainingShipSizes: aiState.remainingShipSizes,
  };
}

// Handles a subsequent hit confirming the axis. Easy ignores hits.
// Records the hit cell in hitCells for Option 3 tracking.
export function handleAxisHit(
  aiState: AIState,
  row: number,
  col: number,
  newAttacked: Set<string>
): AIState {
  if (aiState.config.difficulty === 'easy') {
    return { ...aiState, attacked: newAttacked };
  }

  const newHitCells = new Set(aiState.hitCells);
  newHitCells.add(`${row},${col}`);

  const axis = inferAxis(aiState.lastHit!, [row, col]);

  const prunedQueue = aiState.targetQueue
    .filter(([r, c]) => (axis === 'row' ? r === row : c === col))
    .filter(([r, c]) => !newAttacked.has(`${r},${c}`));

  const axialNext = getCellsAlongAxis(row, col, axis, newAttacked);
  const newQueue  = mergeUnique(prunedQueue, axialNext);

  // Empty queue after axis pruning — try firstHit backtrack, then Option 3 scan.
  if (newQueue.length === 0) {
    if (aiState.firstHit) {
      const [fr, fc] = aiState.firstHit;
      const recovery = getAllAdjacentCells(fr, fc, newAttacked);
      if (recovery.length > 0) {
        return {
          mode:               'target',
          firstHit:           aiState.firstHit,
          lastHit:            aiState.firstHit,
          targetQueue:        recovery,
          attacked:           newAttacked,
          hitCells:           newHitCells,
          resolvedHits:       aiState.resolvedHits,
          config:             aiState.config,
          remainingShipSizes: aiState.remainingShipSizes,
        };
      }
    }
    // firstHit adjacents exhausted too — Option 3 scan
    const seed = findUnresolvedSeed(
      newHitCells, aiState.resolvedHits, null, newAttacked
    );
    if (seed) {
      return {
        mode:               'target',
        firstHit:           seed.cell,
        lastHit:            seed.cell,
        targetQueue:        seed.adjacents,
        attacked:           newAttacked,
        hitCells:           newHitCells,
        resolvedHits:       aiState.resolvedHits,
        config:             aiState.config,
        remainingShipSizes: aiState.remainingShipSizes,
      };
    }
    return {
      mode:               'hunt',
      firstHit:           null,
      lastHit:            null,
      targetQueue:        [],
      attacked:           newAttacked,
      hitCells:           newHitCells,
      resolvedHits:       aiState.resolvedHits,
      config:             aiState.config,
      remainingShipSizes: aiState.remainingShipSizes,
    };
  }

  return {
    mode:               'target',
    firstHit:           aiState.firstHit,
    lastHit:            [row, col],
    targetQueue:        newQueue,
    attacked:           newAttacked,
    hitCells:           newHitCells,
    resolvedHits:       aiState.resolvedHits,
    config:             aiState.config,
    remainingShipSizes: aiState.remainingShipSizes,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function updateAIState(
  aiState: AIState,
  row: number,
  col: number,
  outcome: AIAttackOutcome
): AIState {
  const newAttacked = recordAttack(aiState, row, col);

  switch (outcome.result) {
    case 'sunk':
      return handleSunk(aiState, newAttacked, outcome.ship?.size, outcome.ship?.cells);
    case 'miss':
      return handleMiss(aiState, row, col, newAttacked);
    case 'hit':
      return (aiState.mode === 'target')
        ? handleAxisHit(aiState, row, col, newAttacked)
        : handleFirstHit(aiState, row, col, newAttacked);
    case 'already-attacked':
      return { ...aiState, attacked: newAttacked };
    default:
      return assertNever(outcome as never);
  }
}