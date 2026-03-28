import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, AIState, Difficulty } from '../models/types';
import { createGame, startGame, playerAttack, opponentAttack, isGameOver, removeShipFromBoard } from '../models/Game';
import { createBoard, placeShip } from '../models/Board';
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
  const [difficulty, setDifficulty]       = useState<Difficulty | null>(null);
  const [playerShotCount, setPlayerShotCount] = useState(0);

  // Refs always hold the latest state so setTimeout callbacks never read
  // stale closure values regardless of React batching behaviour.
  const gameStateRef = useRef<GameState>(gameState);
  const aiStateRef   = useRef<AIState>(aiState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { aiStateRef.current   = aiState;   }, [aiState]);

  // Timeout IDs stored in refs so they can be cancelled on unmount,
  // preventing state updates being called on an unmounted component.
  const battleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (battleTimerRef.current) clearTimeout(battleTimerRef.current);
      if (aiTimerRef.current)     clearTimeout(aiTimerRef.current);
    };
  }, []);

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

    const ship = createShip(def.name, def.size);

    // Validate and build the new board against the ref — gameStateRef.current
    // is kept in sync with every render via useEffect, so it always reflects
    // the latest committed board even between React batches. Reading from it
    // here is safe because selectShip and placeSelectedShip are always called
    // in separate act() / event-handler calls, ensuring a flush between them.
    const result = placeShip(gameStateRef.current.playerBoard, ship, row, col, orientation);
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
  }, [setupState]);

  // ── Setup: randomize ships ────────────────────────────────────────────────
  // When all ships are already placed, passes an empty exclude list so the
  // entire fleet is re-randomized from scratch. When only some ships are
  // placed, preserves those and randomizes only the remainder.
  // Delegates entirely to randomBoard() in helpers.ts in both cases.

  const randomizePlacement = useCallback(() => {
    const { placedShipNames } = setupState;
    const allPlaced = placedShipNames.length === FLEET.length;

    setGameState(prev => ({
      ...prev,
      playerBoard: randomBoard(allPlaced ? undefined : prev.playerBoard, allPlaced ? [] : placedShipNames),
    }));

    setSetupState(prev => ({
      ...prev,
      placedShipNames: FLEET.map(f => f.name),
      selectedShipName: null,
    }));
  }, [setupState]);

  // ── Setup: clear all placed ships ────────────────────────────────────────────

  const clearBoard = useCallback(() => {
    setGameState(prev => ({ ...prev, playerBoard: createBoard() }));
    setSetupState(prev => ({
      ...prev,
      placedShipNames: [],
      selectedShipName: FLEET[0].name,
    }));
  }, []);

  // ── Select difficulty ────────────────────────────────────────────────────────

  const selectDifficulty = useCallback((d: Difficulty) => {
    setDifficulty(d);
  }, []);

  // ── Transition: setup → playing ────────────────────────────────────────────

  const beginGame = useCallback(() => {
    setBattleStarting(true);
    battleTimerRef.current = setTimeout(() => {
      setGameState(prev => startGame({ ...prev, opponentBoard: randomBoard() }));
      setAIState(createAIState(difficulty ? { difficulty } : undefined));
      addLog('BATTLE COMMENCED — FIRE AT WILL', 'system');
      setBattleStarting(false);
    }, 1500);
  }, [addLog, difficulty]);

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
    setPlayerShotCount(prev => prev + 1);

    const coord = `${COLUMN_LABELS[col]}${row + 1}`;
    if      (outcome.result === 'sunk') addLog(`▸ ${coord} — SUNK ${outcome.ship!.name.toUpperCase()}`, 'sunk');
    else if (outcome.result === 'hit')  addLog(`▸ ${coord} — HIT`, 'hit');
    else                                addLog(`▸ ${coord} — MISS`, 'miss');

    if (isGameOver(afterAttack)) return;

    // ── AI turn ──────────────────────────────────────────────────────────────
    // Compute the full AI outcome outside of setGameState to avoid
    // React Strict Mode calling the updater twice and double-logging.

    setAiThinking(true);
    aiTimerRef.current = setTimeout(() => {
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

      setGameState(prev => ({
        ...afterAI,
        // Functional update: prev.shotCount is the committed value after the
        // player's turn. Adding 1 here counts the AI's shot so that
        // gameState.shotCount reflects total shots fired by both sides,
        // which the header displays as "MISSILES FIRED".
        shotCount: prev.shotCount + 1,
      }));
      setAIState(newAIState);
      setAiThinking(false);
    }, 900 + Math.random() * 400);
  }, [gameState, aiState, aiThinking, addLog]);

  // ── Reset entire game ──────────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    if (battleTimerRef.current) clearTimeout(battleTimerRef.current);
    if (aiTimerRef.current)     clearTimeout(aiTimerRef.current);
    setGameState(createGame());
    setAIState(createAIState());
    setLog([]);
    setAiThinking(false);
    setBattleStarting(false);
    setPlayerShotCount(0);
    setSetupState({
      placedShipNames: [],
      selectedShipName: null,
      orientation: 'horizontal',
    });
    setDifficulty(null);
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
    difficulty,
    playerShotCount,
    selectShip,
    setOrientation,
    placeSelectedShip,
    randomizePlacement,
    clearBoard,
    beginGame,
    selectDifficulty,
    fireAt,
    resetGame,
  };
}