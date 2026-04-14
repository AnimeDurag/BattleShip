import { useState, useCallback, useRef } from 'react';
import type { Board, GameState, PvPPhase } from '../models/types';
import { createBoard, placeShip, allShipsSunk, receiveAttack } from '../models/Board';
import { createShip } from '../models/Ship';
import { FLEET, COLUMN_LABELS } from '../utils/constants';
import { randomBoard } from '../utils/helpers';
import { removeShipFromBoard } from '../models/Game';
import type { SetupState, LogEntry } from './useGameState';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePvPGameState() {
  // ── Boards ──
  const [p1Board, setP1Board] = useState<Board>(createBoard);
  const [p2Board, setP2Board] = useState<Board>(createBoard);

  // ── Phase / turn ──
  const [pvpPhase,      setPvpPhase]      = useState<PvPPhase>('setup-p1');
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [startingPlayer, setStartingPlayer] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<1 | 2 | null>(null);

  // ── Shot / hit counters ──
  const [p1Shots, setP1Shots] = useState(0);
  const [p2Shots, setP2Shots] = useState(0);
  const [p1Hits,  setP1Hits]  = useState(0);
  const [p2Hits,  setP2Hits]  = useState(0);

  // ── Combat log ──
  const [log, setLog] = useState<LogEntry[]>([]);

  // ── Setup state for each player ──
  const [p1SetupState, setP1SetupState] = useState<SetupState>({
    placedShipNames: [],
    selectedShipName: null,
    orientation: 'horizontal',
  });
  const [p2SetupState, setP2SetupState] = useState<SetupState>({
    placedShipNames: [],
    selectedShipName: null,
    orientation: 'horizontal',
  });

  // Refs to always hold latest board state for callbacks
  const p1BoardRef = useRef<Board>(p1Board);
  const p2BoardRef = useRef<Board>(p2Board);
  p1BoardRef.current = p1Board;
  p2BoardRef.current = p2Board;

  // ── Log helper ──
  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLog(prev => [
      { id: Date.now() + Math.random(), message, type },
      ...prev,
    ].slice(0, 14));
  }, []);

  // ─── P1 Setup Actions ─────────────────────────────────────────────────────

  const selectP1Ship = useCallback((name: string) => {
    setP1Board(prev => {
      const alreadyPlaced = prev.ships.some(s => s.name === name);
      if (!alreadyPlaced) return prev;
      // Remove from board by rebuilding without that ship
      const gs = { phase: 'setup' as const, playerBoard: prev, opponentBoard: createBoard(), currentTurn: 'player' as const, winner: null, shotCount: 0, turnCount: 0 };
      return removeShipFromBoard(gs, name).playerBoard;
    });
    setP1SetupState(prev => ({
      ...prev,
      selectedShipName: name,
      placedShipNames: prev.placedShipNames.filter(n => n !== name),
    }));
  }, []);

  const setP1Orientation = useCallback((o: 'horizontal' | 'vertical') => {
    setP1SetupState(prev => ({ ...prev, orientation: o }));
  }, []);

  const placeP1Ship = useCallback((row: number, col: number): boolean => {
    const { selectedShipName, orientation, placedShipNames } = p1SetupState;
    if (!selectedShipName) return false;

    const def = FLEET.find(f => f.name === selectedShipName);
    if (!def) return false;

    const ship = createShip(def.name, def.size);
    const result = placeShip(p1BoardRef.current, ship, row, col, orientation);
    if (!result) return false;

    setP1Board(result);

    const newPlaced = [...placedShipNames, selectedShipName];
    const nextDef   = FLEET.find(f => !newPlaced.includes(f.name));

    setP1SetupState(prev => ({
      ...prev,
      placedShipNames: newPlaced,
      selectedShipName: nextDef?.name ?? null,
    }));

    return true;
  }, [p1SetupState]);

  const randomizeP1Board = useCallback(() => {
    const { placedShipNames } = p1SetupState;
    const allPlaced = placedShipNames.length === FLEET.length;

    setP1Board(prev => randomBoard(allPlaced ? undefined : prev, allPlaced ? [] : placedShipNames));
    setP1SetupState(prev => ({
      ...prev,
      placedShipNames: FLEET.map(f => f.name),
      selectedShipName: null,
    }));
  }, [p1SetupState]);

  const clearP1Board = useCallback(() => {
    setP1Board(createBoard());
    setP1SetupState(prev => ({
      ...prev,
      placedShipNames: [],
      selectedShipName: FLEET[0].name,
    }));
  }, []);

  const finishP1Setup = useCallback(() => {
    if (p1SetupState.placedShipNames.length !== FLEET.length) return;
    setPvpPhase('handoff-to-p2-setup');
  }, [p1SetupState]);

  // ─── P2 Setup Actions ─────────────────────────────────────────────────────

  const selectP2Ship = useCallback((name: string) => {
    setP2Board(prev => {
      const alreadyPlaced = prev.ships.some(s => s.name === name);
      if (!alreadyPlaced) return prev;
      const gs = { phase: 'setup' as const, playerBoard: prev, opponentBoard: createBoard(), currentTurn: 'player' as const, winner: null, shotCount: 0, turnCount: 0 };
      return removeShipFromBoard(gs, name).playerBoard;
    });
    setP2SetupState(prev => ({
      ...prev,
      selectedShipName: name,
      placedShipNames: prev.placedShipNames.filter(n => n !== name),
    }));
  }, []);

  const setP2Orientation = useCallback((o: 'horizontal' | 'vertical') => {
    setP2SetupState(prev => ({ ...prev, orientation: o }));
  }, []);

  const placeP2Ship = useCallback((row: number, col: number): boolean => {
    const { selectedShipName, orientation, placedShipNames } = p2SetupState;
    if (!selectedShipName) return false;

    const def = FLEET.find(f => f.name === selectedShipName);
    if (!def) return false;

    const ship = createShip(def.name, def.size);
    const result = placeShip(p2BoardRef.current, ship, row, col, orientation);
    if (!result) return false;

    setP2Board(result);

    const newPlaced = [...placedShipNames, selectedShipName];
    const nextDef   = FLEET.find(f => !newPlaced.includes(f.name));

    setP2SetupState(prev => ({
      ...prev,
      placedShipNames: newPlaced,
      selectedShipName: nextDef?.name ?? null,
    }));

    return true;
  }, [p2SetupState]);

  const randomizeP2Board = useCallback(() => {
    const { placedShipNames } = p2SetupState;
    const allPlaced = placedShipNames.length === FLEET.length;

    setP2Board(prev => randomBoard(allPlaced ? undefined : prev, allPlaced ? [] : placedShipNames));
    setP2SetupState(prev => ({
      ...prev,
      placedShipNames: FLEET.map(f => f.name),
      selectedShipName: null,
    }));
  }, [p2SetupState]);

  const clearP2Board = useCallback(() => {
    setP2Board(createBoard());
    setP2SetupState(prev => ({
      ...prev,
      placedShipNames: [],
      selectedShipName: FLEET[0].name,
    }));
  }, []);

  const finishP2Setup = useCallback(() => {
    if (p2SetupState.placedShipNames.length !== FLEET.length) return;
    const first: 1 | 2 = Math.random() < 0.5 ? 1 : 2;
    setStartingPlayer(first);
    setCurrentPlayer(first);
    setPvpPhase('handoff-to-battle');
  }, [p2SetupState]);

  // ─── Handoff ──────────────────────────────────────────────────────────────

  // Log battle start when phase becomes 'playing' from handoff-to-battle
  // We handle this in the component via a useEffect — but simpler: log here
  // using a ref so it only fires once per battle start transition.
  const battleLoggedRef = useRef(false);

  const advanceHandoffWithLog = useCallback(() => {
    if (pvpPhase === 'handoff-to-p2-setup') {
      setPvpPhase('setup-p2');
    } else if (pvpPhase === 'handoff-to-battle') {
      battleLoggedRef.current = false;
      setPvpPhase('playing');
    } else if (pvpPhase === 'handoff-between-turns') {
      // Call both setters at the top level — never nest setState calls inside
      // another setState updater, as React StrictMode double-invokes updaters
      // which would cause the toggle to cancel itself out.
      setCurrentPlayer(cp => cp === 1 ? 2 : 1);
      setPvpPhase('playing');
    }
  }, [pvpPhase]);

  // ─── Combat ───────────────────────────────────────────────────────────────

  const fireAt = useCallback((row: number, col: number) => {
    if (pvpPhase !== 'playing') return;

    const isP1Turn = currentPlayer === 1;
    const targetBoard = isP1Turn ? p2BoardRef.current : p1BoardRef.current;

    const { board: updatedBoard, outcome } = receiveAttack(targetBoard, row, col);
    if (outcome.result === 'already-attacked') return;

    const coord = `${COLUMN_LABELS[col]}${row + 1}`;

    if (isP1Turn) {
      setP2Board(updatedBoard);
      setP1Shots(prev => prev + 1);

      if (outcome.result === 'hit') {
        setP1Hits(prev => prev + 1);
        addLog(`▸ P1 ${coord} — HIT`, 'hit');
      } else if (outcome.result === 'sunk') {
        setP1Hits(prev => prev + 1);
        addLog(`▸ P1 ${coord} — SUNK ${outcome.ship.name.toUpperCase()}`, 'sunk');
      } else {
        addLog(`▸ P1 ${coord} — MISS`, 'miss');
      }

      if (allShipsSunk(updatedBoard)) {
        setPvpPhase('gameover');
        setWinner(1);
      } else if (outcome.result === 'miss') {
        setPvpPhase('handoff-between-turns');
      }
    } else {
      setP1Board(updatedBoard);
      setP2Shots(prev => prev + 1);

      if (outcome.result === 'hit') {
        setP2Hits(prev => prev + 1);
        addLog(`◂ P2 ${coord} — HIT`, 'enemy');
      } else if (outcome.result === 'sunk') {
        setP2Hits(prev => prev + 1);
        addLog(`◂ P2 ${coord} — SUNK ${outcome.ship.name.toUpperCase()}`, 'enemy');
      } else {
        addLog(`◂ P2 ${coord} — MISS`, 'enemy');
      }

      if (allShipsSunk(updatedBoard)) {
        setPvpPhase('gameover');
        setWinner(2);
      } else if (outcome.result === 'miss') {
        setPvpPhase('handoff-between-turns');
      }
    }
  }, [pvpPhase, currentPlayer, addLog]);

  // ─── Reset ────────────────────────────────────────────────────────────────

  const resetPvP = useCallback(() => {
    setP1Board(createBoard());
    setP2Board(createBoard());
    setPvpPhase('setup-p1');
    setCurrentPlayer(1);
    setStartingPlayer(1);
    setWinner(null);
    setP1Shots(0);
    setP2Shots(0);
    setP1Hits(0);
    setP2Hits(0);
    setLog([]);
    setP1SetupState({
      placedShipNames: [],
      selectedShipName: null,
      orientation: 'horizontal',
    });
    setP2SetupState({
      placedShipNames: [],
      selectedShipName: null,
      orientation: 'horizontal',
    });
    battleLoggedRef.current = false;
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const p1AllShipsPlaced = p1SetupState.placedShipNames.length === FLEET.length;
  const p2AllShipsPlaced = p2SetupState.placedShipNames.length === FLEET.length;

  const currentGameState: GameState = {
    phase:         pvpPhase === 'playing' ? 'playing' : pvpPhase === 'gameover' ? 'gameover' : 'setup',
    playerBoard:   currentPlayer === 1 ? p1Board : p2Board,
    opponentBoard: currentPlayer === 1 ? p2Board : p1Board,
    currentTurn:   'player',
    winner:        winner !== null && winner === currentPlayer ? 'player' : null,
    shotCount:     currentPlayer === 1 ? p1Shots : p2Shots,
    turnCount:     currentPlayer === 1 ? p1Shots : p2Shots,
  };

  return {
    p1Board,
    p2Board,
    pvpPhase,
    currentPlayer,
    startingPlayer,
    winner,
    p1Shots,
    p2Shots,
    p1Hits,
    p2Hits,
    log,
    p1SetupState,
    p2SetupState,
    p1AllShipsPlaced,
    p2AllShipsPlaced,
    currentGameState,
    // P1 setup
    selectP1Ship,
    setP1Orientation,
    placeP1Ship,
    randomizeP1Board,
    clearP1Board,
    finishP1Setup,
    // P2 setup
    selectP2Ship,
    setP2Orientation,
    placeP2Ship,
    randomizeP2Board,
    clearP2Board,
    finishP2Setup,
    // Handoff
    advanceHandoff: advanceHandoffWithLog,
    // Combat
    fireAt,
    // Reset
    resetPvP,
  };
}
