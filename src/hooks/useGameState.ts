import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, AIState } from '../models/types';
import { createGame, startGame, playerAttack, opponentAttack, isGameOver, removeShipFromBoard } from '../models/Game';
import { placeShip } from '../models/Board';
import { createShip } from '../models/Ship';
import { createAIState, getAIMove, updateAIState } from '../ai/opponent';
import { FLEET, COLUMN_LABELS } from '../utils/constants';
import { randomBoard } from '../utils/helpers';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogEntry {
  id: number;
  message: string;
  type: 'hit' | 'miss' | 'sunk' | 'enemy' | 'system';
}

export interface SetupState {
  placedShipNames: string[];
  selectedShipName: string | null;
  orientation: 'horizontal' | 'vertical';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameState() {
  const [gameState, setGameState]   = useState<GameState>(createGame());
  const [aiState, setAIState]       = useState<AIState>(createAIState());
  const [log, setLog]               = useState<LogEntry[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [battleStarting, setBattleStarting] = useState(false);

  // Refs always hold the latest state so setTimeout callbacks never read
  // stale closure values regardless of React batching behaviour.
  const gameStateRef = useRef<GameState>(gameState);
  const aiStateRef   = useRef<AIState>(aiState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { aiStateRef.current   = aiState;   }, [aiState]);

  const [setupState, setSetupState] = useState<SetupState>({
    placedShipNames: [],
    selectedShipName: null,
    orientation: 'horizontal',
  });

  // ── Logging ────────────────────────────────────────────────────────────────

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLog(prev => [
      { id: Date.now() + Math.random(), message, type },
      ...prev,
    ].slice(0, 14));
  }, []);

  // ── Setup: select / reposition a ship ─────────────────────────────────────

  const selectShip = useCallback((name: string) => {
    setGameState(prev => {
      const alreadyPlaced = prev.playerBoard.ships.some(s => s.name === name);
      return alreadyPlaced ? removeShipFromBoard(prev, name) : prev;
    });
    setSetupState(prev => ({
      ...prev,
      selectedShipName: name,
      placedShipNames: prev.placedShipNames.filter(n => n !== name),
    }));
  }, []);

  // ── Setup: set orientation ─────────────────────────────────────────────────

  const setOrientation = useCallback((o: 'horizontal' | 'vertical') => {
    setSetupState(prev => ({ ...prev, orientation: o }));
  }, []);

  // ── Setup: place selected ship on the board ────────────────────────────────

  const placeSelectedShip = useCallback((row: number, col: number): boolean => {
    const { selectedShipName, orientation, placedShipNames } = setupState;
    if (!selectedShipName) return false;

    const def = FLEET.find(f => f.name === selectedShipName);
    if (!def) return false;

    const ship   = createShip(def.name, def.size);
    const result = placeShip(gameState.playerBoard, ship, row, col, orientation);
    if (!result) return false;

    setGameState(prev => ({ ...prev, playerBoard: result }));

    const newPlaced = [...placedShipNames, selectedShipName];
    const nextDef   = FLEET.find(f => !newPlaced.includes(f.name));

    setSetupState(prev => ({
      ...prev,
      placedShipNames: newPlaced,
      selectedShipName: nextDef?.name ?? null,
    }));

    return true;
  }, [setupState, gameState.playerBoard]);

  // ── Setup: randomize only unplaced ships ──────────────────────────────────
  // Delegates entirely to randomBoard() in helpers.ts, passing the current
  // board and the names of already-placed ships to preserve. This keeps the
  // logic in one place for the CLI, React UI, and future multiplayer mode.

  const randomizePlacement = useCallback(() => {
    const { placedShipNames } = setupState;
    if (placedShipNames.length === FLEET.length) return;

    setGameState(prev => ({
      ...prev,
      playerBoard: randomBoard(prev.playerBoard, placedShipNames),
    }));

    setSetupState(prev => ({
      ...prev,
      placedShipNames: FLEET.map(f => f.name),
      selectedShipName: null,
    }));
  }, [setupState]);

  // ── Transition: setup → playing ────────────────────────────────────────────

  const beginGame = useCallback(() => {
    setBattleStarting(true);
    setTimeout(() => {
      setGameState(prev => startGame({ ...prev, opponentBoard: randomBoard() }));
      setAIState(createAIState());
      addLog('BATTLE COMMENCED — FIRE AT WILL', 'system');
      setBattleStarting(false);
    }, 1500);
  }, [addLog]);

  // ── Player attacks ─────────────────────────────────────────────────────────

  const fireAt = useCallback((row: number, col: number) => {
    if (
      gameState.currentTurn !== 'player' ||
      gameState.phase       !== 'playing' ||
      aiThinking
    ) return;

    const { state: afterAttack, outcome } = playerAttack(gameState, row, col);
    if (outcome.result === 'already-attacked') return;

    setGameState(afterAttack);

    const coord = `${COLUMN_LABELS[col]}${row + 1}`;
    if      (outcome.result === 'sunk') addLog(`▸ ${coord} — SUNK ${outcome.ship!.name.toUpperCase()}`, 'sunk');
    else if (outcome.result === 'hit')  addLog(`▸ ${coord} — HIT`, 'hit');
    else                                addLog(`▸ ${coord} — MISS`, 'miss');

    if (isGameOver(afterAttack)) return;

    // ── AI turn ──────────────────────────────────────────────────────────────
    // Compute the full AI outcome outside of setGameState to avoid
    // React Strict Mode calling the updater twice and double-logging.

    setAiThinking(true);
    setTimeout(() => {
      // Read from ref to guarantee we operate on the latest committed state
      // even if React has batched updates since the timeout was scheduled.
      const latestState   = gameStateRef.current;
      const latestAIState = aiStateRef.current;
      const [aiRow, aiCol]                          = getAIMove(latestAIState);
      const { state: afterAI, outcome: aiOutcome }  = opponentAttack(latestState, aiRow, aiCol);
      const newAIState                              = updateAIState(latestAIState, aiRow, aiCol, aiOutcome);

      const aiCoord = `${COLUMN_LABELS[aiCol]}${aiRow + 1}`;
      if      (aiOutcome.result === 'sunk') addLog(`◂ ENEMY ${aiCoord} — SUNK YOUR ${aiOutcome.ship!.name.toUpperCase()}`, 'enemy');
      else if (aiOutcome.result === 'hit')  addLog(`◂ ENEMY ${aiCoord} — HIT YOUR SHIP`, 'enemy');
      else                                  addLog(`◂ ENEMY ${aiCoord} — MISS`, 'enemy');

      setGameState(afterAI);
      setAIState(newAIState);
      setAiThinking(false);
    }, 900 + Math.random() * 400);
  }, [gameState, aiState, aiThinking, addLog]);

  // ── Reset entire game ──────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    setGameState(createGame());
    setAIState(createAIState());
    setLog([]);
    setAiThinking(false);
    setSetupState({
      placedShipNames: [],
      selectedShipName: null,
      orientation: 'horizontal',
    });
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const allShipsPlaced = setupState.placedShipNames.length === FLEET.length;

  return {
    gameState,
    setupState,
    log,
    aiThinking,
    battleStarting,
    allShipsPlaced,
    selectShip,
    setOrientation,
    placeSelectedShip,
    randomizePlacement,
    beginGame,
    fireAt,
    resetGame,
  };
}