import { createAIState, getAIMove, updateAIState } from '../ai/opponent';
import { createBoard } from '../models/Board';

describe('AI Opponent', () => {
  it('initializes in hunt mode', () => {
    const ai = createAIState();
    expect(ai.mode).toBe('hunt');
    expect(ai.targetQueue.length).toBe(0);
    expect(ai.attacked.size).toBe(0);
  });

  it('returns a valid move within board bounds', () => {
    const ai = createAIState();
    const [row, col] = getAIMove(ai);
    expect(row).toBeGreaterThanOrEqual(0);
    expect(row).toBeLessThan(10);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(10);
  });

  it('switches to target mode after a hit', () => {
    let ai = createAIState();
    ai = updateAIState(ai, 3, 3, { result: 'hit' });
    expect(ai.mode).toBe('target');
    expect(ai.targetQueue.length).toBeGreaterThan(0);
  });

  it('returns to hunt mode after a sunk', () => {
    let ai = createAIState();
    ai = updateAIState(ai, 3, 3, { result: 'hit' });
    ai = updateAIState(ai, 3, 4, { result: 'sunk' });
    expect(ai.mode).toBe('hunt');
    expect(ai.targetQueue.length).toBe(0);
  });

  it('does not repeat a move', () => {
    let ai = createAIState();
    const [row, col] = getAIMove(ai);
    ai = updateAIState(ai, row, col, { result: 'miss' });
    expect(ai.attacked.has(`${row},${col}`)).toBe(true);
  });
});