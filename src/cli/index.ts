import { GameState } from '../models/types';
import { createGame, startGame, playerAttack, opponentAttack, isGameOver } from '../models/Game';
import { placeShip } from '../models/Board';
import { createShip } from '../models/Ship';
import { createAIState, getAIMove, updateAIState } from '../ai/opponent';
import { FLEET } from '../utils/constants';
import { randomInt, randomOrientation, formatCoordinate } from '../utils/helpers';
import {
  displayBoards,
  displayPlayerBoard,
  displayFleetStatus,
  displayGameOver,
  displayDivider,
} from './display';
import {
  promptAttack,
  promptPlacement,
  promptOrientation,
  promptRandomPlacement,
  promptPlayAgain,
  promptContinue,
} from './prompts';

// ─── Ship Placement ────────────────────────────────────────────────────────────

function placeShipsRandomly(state: GameState, target: 'playerBoard' | 'opponentBoard'): GameState {
  let board = state[target];

  for (const def of FLEET) {
    const ship = createShip(def.name, def.size);
    let placed = false;

    while (!placed) {
      const row = randomInt(10);
      const col = randomInt(10);
      const orientation = randomOrientation();
      const result = placeShip(board, ship, row, col, orientation);

      if (result) {
        board = result;
        placed = true;
      }
    }
  }

  return { ...state, [target]: board };
}

function placeShipsManually(state: GameState): GameState {
  let board = state.playerBoard;

  console.log('\n  Time to place your fleet!\n');

  for (const def of FLEET) {
    let placed = false;

    while (!placed) {
      displayPlayerBoard(board);
      const ship = createShip(def.name, def.size);
      const [row, col] = promptPlacement(def.name, def.size);
      const orientation = promptOrientation();
      const result = placeShip(board, ship, row, col, orientation);

      if (result) {
        board = result;
        placed = true;
        console.log(`  ✓ ${def.name} placed.\n`);
      } else {
        console.log('  ✗ Invalid placement — ship goes out of bounds or overlaps. Try again.\n');
      }
    }
  }

  return { ...state, playerBoard: board };
}

// ─── Setup Phase ───────────────────────────────────────────────────────────────

function setupPhase(state: GameState): GameState {
  console.clear();
  console.log('\n  Welcome to BATTLESHIP\n');

  // Player ship placement
  const randomize = promptRandomPlacement();
  state = randomize
    ? placeShipsRandomly(state, 'playerBoard')
    : placeShipsManually(state);

  // Opponent ship placement (always random)
  state = placeShipsRandomly(state, 'opponentBoard');

  console.log('\n  All ships placed. Starting game...\n');
  promptContinue();

  return startGame(state);
}

// ─── Playing Phase ─────────────────────────────────────────────────────────────

function playingPhase(state: GameState): GameState {
  let aiState = createAIState();

  while (!isGameOver(state)) {
    // ── Player Turn ──
    console.clear();
    displayBoards(state);
    displayFleetStatus(state);

    let validAttack = false;
    while (!validAttack) {
      const [row, col] = promptAttack();
      const { state: afterAttack, outcome } = playerAttack(state, row, col);

      if (outcome.result === 'already-attacked') {
        console.log('  You already attacked that cell. Choose another.\n');
        continue;
      }

      state = afterAttack;
      validAttack = true;

      const coord = formatCoordinate(row, col);
      if (outcome.result === 'sunk') {
        console.log(`\n  ★ Direct hit — you sank their ${outcome.ship!.name}!`);
      } else if (outcome.result === 'hit') {
        console.log(`\n  ✓ Hit at ${coord}!`);
      } else {
        console.log(`\n  ~ Miss at ${coord}.`);
      }
    }

    if (isGameOver(state)) break;

    promptContinue();

    // ── Opponent Turn ──
    const [aiRow, aiCol] = getAIMove(aiState);
    const { state: afterAI, outcome: aiOutcome } = opponentAttack(state, aiRow, aiCol);
    aiState = updateAIState(aiState, aiRow, aiCol, aiOutcome);
    state = afterAI;

    const aiCoord = formatCoordinate(aiRow, aiCol);
    displayDivider();

    if (aiOutcome.result === 'sunk') {
      console.log(`  Enemy attacked ${aiCoord} — they sank your ${aiOutcome.ship!.name}!`);
    } else if (aiOutcome.result === 'hit') {
      console.log(`  Enemy attacked ${aiCoord} — hit!`);
    } else {
      console.log(`  Enemy attacked ${aiCoord} — miss.`);
    }

    promptContinue();
  }

  return state;
}

// ─── Main Loop ─────────────────────────────────────────────────────────────────

function main(): void {
  let playAgain = true;

  while (playAgain) {
    let state = createGame();
    state = setupPhase(state);
    state = playingPhase(state);

    console.clear();
    displayBoards(state);
    displayGameOver(state);

    playAgain = promptPlayAgain();
  }

  console.log('\n  Thanks for playing. Good luck on the resume!\n');
  process.exit(0);
}

main();