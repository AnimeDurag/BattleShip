/**
 * BoardGrid component tests
 *
 * Covers structural rendering (labels, cell count), ARIA attributes, cell
 * interactivity (attack/place buttons, click coordinates), setup preview,
 * invalid-placement shake animation, and keyboard navigation.
 *
 * Required jest config:   testEnvironment: 'jsdom'
 * Required packages:      @testing-library/react  @testing-library/jest-dom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardGrid from '../components/BoardGrid';
import { createBoard, placeShip, receiveAttack } from '../models/Board';
import { createShip } from '../models/Ship';
import { COLUMN_LABELS } from '../utils/constants';

// ─── Structure ────────────────────────────────────────────────────────────────

describe('BoardGrid — structure', () => {
  it('renders all 10 column labels (A–J)', () => {
    render(<BoardGrid board={createBoard()} isOwn={true} phase="playing" />);
    COLUMN_LABELS.forEach(label => {
      expect(screen.getByText(label)).toBeDefined();
    });
  });

  it('renders all 10 row labels (1–10)', () => {
    render(<BoardGrid board={createBoard()} isOwn={true} phase="playing" />);
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByText(String(i))).toBeDefined();
    }
  });

  it('renders exactly 100 cells (10×10)', () => {
    const { container } = render(<BoardGrid board={createBoard()} isOwn={true} phase="playing" />);
    expect(container.querySelectorAll('.cell').length).toBe(100);
  });
});

// ─── ARIA ─────────────────────────────────────────────────────────────────────

describe('BoardGrid — ARIA', () => {
  it('has role="grid" on the board wrapper', () => {
    render(<BoardGrid board={createBoard()} isOwn={false} phase="playing" />);
    expect(screen.getByRole('grid')).toBeDefined();
  });

  it('has aria-label "Your waters" for own board', () => {
    render(<BoardGrid board={createBoard()} isOwn={true} phase="playing" />);
    expect(screen.getByRole('grid', { name: 'Your waters' })).toBeDefined();
  });

  it('has aria-label "Enemy waters" for enemy board', () => {
    render(<BoardGrid board={createBoard()} isOwn={false} phase="playing" />);
    expect(screen.getByRole('grid', { name: 'Enemy waters' })).toBeDefined();
  });
});

// ─── Cell interactivity ───────────────────────────────────────────────────────

describe('BoardGrid — cell interactivity', () => {
  it('renders 100 attack buttons on enemy board when onCellClick is provided', () => {
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={() => {}} />
    );
    expect(screen.getAllByRole('button', { name: 'Attack cell' }).length).toBe(100);
  });

  it('does not render attack buttons on own board', () => {
    render(<BoardGrid board={createBoard()} isOwn={true} phase="playing" />);
    expect(screen.queryAllByRole('button', { name: 'Attack cell' }).length).toBe(0);
  });

  it('does not render attack buttons when onCellClick is absent', () => {
    render(<BoardGrid board={createBoard()} isOwn={false} phase="playing" />);
    expect(screen.queryAllByRole('button', { name: 'Attack cell' }).length).toBe(0);
  });

  it('calls onCellClick with (0, 0) when the first cell is clicked', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={onCellClick} />
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Attack cell' })[0]);
    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });

  it('calls onCellClick with (0, 9) for the last cell in row 0', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={onCellClick} />
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Attack cell' })[9]);
    expect(onCellClick).toHaveBeenCalledWith(0, 9);
  });

  it('calls onCellClick with (1, 0) for the first cell in row 1', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={onCellClick} />
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Attack cell' })[10]);
    expect(onCellClick).toHaveBeenCalledWith(1, 0);
  });

  it('calls onCellClick with (9, 9) for the last cell overall', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={onCellClick} />
    );
    const buttons = screen.getAllByRole('button', { name: 'Attack cell' });
    fireEvent.click(buttons[99]);
    expect(onCellClick).toHaveBeenCalledWith(9, 9);
  });
});

// ─── Setup phase ─────────────────────────────────────────────────────────────

describe('BoardGrid — setup phase', () => {
  it('renders 100 place-ship buttons when phase=setup, isOwn=true, setupShipSize provided', () => {
    render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );
    expect(screen.getAllByRole('button', { name: 'Place ship' }).length).toBe(100);
  });

  it('does not render place-ship buttons when setupShipSize is absent', () => {
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup" onCellClick={() => {}} />
    );
    expect(screen.queryAllByRole('button', { name: 'Place ship' }).length).toBe(0);
  });

  it('does not render place-ship buttons on enemy board in setup', () => {
    render(
      <BoardGrid
        board={createBoard()}
        isOwn={false}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );
    expect(screen.queryAllByRole('button', { name: 'Place ship' }).length).toBe(0);
  });
});

// ─── Shake on invalid placement ───────────────────────────────────────────────

describe('BoardGrid — shake animation on invalid placement', () => {
  it('adds board-grid--shake when a collision cell is clicked', () => {
    // Manually construct a board with a ship occupying (0,0)–(0,2)
    let board = createBoard();
    const ship = {
      ...createShip('Cruiser', 3),
      cells: [[0, 0], [0, 1], [0, 2]] as [number, number][],
    };
    board = {
      ...board,
      grid: board.grid.map((row, r) =>
        row.map((cell, c) => (r === 0 && c <= 2 ? 'ship' : cell)) as typeof row
      ),
      ships: [ship],
    };

    const { container } = render(
      <BoardGrid
        board={board}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );

    // Clicking cell (0,0) causes a collision → invalid → shake
    fireEvent.click(screen.getAllByRole('button', { name: 'Place ship' })[0]);
    expect(container.querySelector('.board-grid--shake')).not.toBeNull();
  });

  it('does not call onCellClick when an invalid preview cell is clicked', () => {
    const onCellClick = jest.fn();
    let board = createBoard();
    const ship = {
      ...createShip('Cruiser', 3),
      cells: [[0, 0], [0, 1], [0, 2]] as [number, number][],
    };
    board = {
      ...board,
      grid: board.grid.map((row, r) =>
        row.map((cell, c) => (r === 0 && c <= 2 ? 'ship' : cell)) as typeof row
      ),
      ships: [ship],
    };

    render(
      <BoardGrid
        board={board}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={onCellClick}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Place ship' })[0]);
    expect(onCellClick).not.toHaveBeenCalled();
  });
});

// ─── Keyboard navigation ──────────────────────────────────────────────────────

describe('BoardGrid — keyboard navigation', () => {
  it('ArrowRight moves the focused cursor right', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(container.querySelector('.cell--focused')).not.toBeNull();
  });

  it('ArrowDown moves the focused cursor down', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(container.querySelector('.cell--focused')).not.toBeNull();
  });

  it('ArrowLeft is clamped at column 0 (cursor stays on a valid cell)', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(container.querySelector('.cell--focused')).not.toBeNull();
  });

  it('ArrowUp is clamped at row 0 (cursor stays on a valid cell)', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(container.querySelector('.cell--focused')).not.toBeNull();
  });

  it('Space fires onCellClick at the current cursor position (0, 0 initially)', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={onCellClick} />
    );
    fireEvent.keyDown(window, { key: ' ' });
    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });

  it('Enter fires onCellClick at the current cursor position', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={onCellClick} />
    );
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });

  it('cursor moves then fires at the updated position', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" onCellClick={onCellClick} />
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // cursor → (0, 1)
    fireEvent.keyDown(window, { key: 'ArrowDown' });  // cursor → (1, 1)
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCellClick).toHaveBeenCalledWith(1, 1);
  });

  it('keyboard handler is inactive on own board (Space does not fire)', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="playing" onCellClick={onCellClick} />
    );
    fireEvent.keyDown(window, { key: ' ' });
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it('keyboard handler is inactive when onCellClick is not provided', () => {
    // Should not throw
    render(<BoardGrid board={createBoard()} isOwn={false} phase="playing" />);
    expect(() => fireEvent.keyDown(window, { key: 'Enter' })).not.toThrow();
  });
});

// ─── Hover preview (lines 100–105) and onMouseEnter (lines 167–170) ──────────

describe('BoardGrid — hover preview and onMouseEnter', () => {
  // Helper: build a board with a 3-cell ship occupying row 0, cols 0–2
  function boardWithShipAt0(): ReturnType<typeof createBoard> {
    let board = createBoard();
    const ship = {
      ...createShip('Cruiser', 3),
      cells: [[0, 0], [0, 1], [0, 2]] as [number, number][],
    };
    board = {
      ...board,
      grid: board.grid.map((row, r) =>
        row.map((cell, c) => (r === 0 && c <= 2 ? 'ship' : cell)) as typeof row
      ),
      ships: [ship],
    };
    return board;
  }

  // ── Lines 100–105: preview cell computation on hover ─────────────────────

  it('hovering over an empty cell in setup mode applies cell--preview-valid to covered cells', () => {
    // Hover at (0,0) with a 3-cell horizontal ship on an empty board.
    // Cells (0,0), (0,1), (0,2) should receive cell--preview-valid.
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[0]); // cell (0,0)
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(3);
    expect(container.querySelectorAll('.cell--preview-invalid').length).toBe(0);
  });

  it('hovering over a cell whose ship would overlap an existing ship applies cell--preview-invalid', () => {
    // Board already has a ship at (0,0)–(0,2).
    // Hovering at (0,0) with a 3-cell ship → collision → invalid.
    const { container } = render(
      <BoardGrid
        board={boardWithShipAt0()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[0]); // (0,0)
    expect(container.querySelectorAll('.cell--preview-invalid').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(0);
  });

  it('hovering near the right edge where the ship would go out of bounds applies cell--preview-invalid', () => {
    // A 3-cell horizontal ship starting at col 9 would cover cols 9,10,11 — out of bounds.
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[9]); // (0,9) — last column
    expect(container.querySelectorAll('.cell--preview-invalid').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(0);
  });

  it('moving hover to a different cell updates the preview to the new position', () => {
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={2}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[0]); // hover (0,0) — preview covers (0,0),(0,1)
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(2);

    fireEvent.mouseLeave(cells[0]);
    fireEvent.mouseEnter(cells[5]); // hover (0,5) — preview covers (0,5),(0,6)
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(2);
    // (0,0) should no longer be highlighted
    expect(cells[0]).not.toHaveClass('cell--preview-valid');
    expect(cells[5]).toHaveClass('cell--preview-valid');
  });

  it('mouseLeave clears the hover so no preview cells are shown', () => {
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="horizontal"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[0]);
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(3);

    fireEvent.mouseLeave(cells[0]); // line 170: setHoverCell(null)
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(0);
  });

  it('no preview is shown when setupShipSize is absent even with hover', () => {
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[0]);
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(0);
    expect(container.querySelectorAll('.cell--preview-invalid').length).toBe(0);
  });

  // ── Lines 167–168: setHoverCell on enemy board (no moveCursor branch) ─────

  it('mouseEnter on an own-board cell in playing phase does not crash', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="playing" />
    );
    const cells = container.querySelectorAll('.cell');
    expect(() => fireEvent.mouseEnter(cells[0])).not.toThrow();
  });

  // ── Line 168: moveCursor branch — only runs on isEnemyBoard ──────────────

  it('mouseEnter on an enemy cell during playing phase moves the keyboard cursor to that cell', () => {
    // After mouseEnter on cell (0,5), pressing Enter should fire at (0,5)
    const onCellClick = jest.fn();
    render(
      <BoardGrid
        board={createBoard()}
        isOwn={false}
        phase="playing"
        onCellClick={onCellClick}
      />
    );
    const cells = screen.getAllByRole('button', { name: 'Attack cell' });
    fireEvent.mouseEnter(cells[5]); // cell (0,5) — triggers moveCursor(0,5)
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCellClick).toHaveBeenCalledWith(0, 5);
  });

  it('mouseEnter on an enemy cell updates the focused cell class', () => {
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={false}
        phase="playing"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[7]); // (0,7)
    // After moveCursor(0,7) the focused cell should be at index 7
    expect(cells[7]).toHaveClass('cell--focused');
  });

  // ── line 22: previewShipCells vertical branch ────────────────────────────

  it('hovering in setup mode with vertical orientation applies preview to cells in the same column', () => {
    // A 3-cell vertical ship at (0,0) covers (0,0),(1,0),(2,0) — all in col 0.
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="vertical"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[0]); // (0,0)
    // 3 cells should be highlighted — (0,0), (1,0), (2,0)
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(3);
    // The highlighted cells must be in column 0 (indices 0, 10, 20 in a 10-col grid)
    expect(cells[0]).toHaveClass('cell--preview-valid');
    expect(cells[10]).toHaveClass('cell--preview-valid');
    expect(cells[20]).toHaveClass('cell--preview-valid');
    // Column 1 cells must not be highlighted
    expect(cells[1]).not.toHaveClass('cell--preview-valid');
  });

  it('vertical ship near the bottom edge is flagged as invalid (out of bounds)', () => {
    // A 3-cell vertical ship starting at row 9 would cover rows 9,10,11 — out of bounds.
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="vertical"
        onCellClick={() => {}}
      />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[90]); // row 9, col 0 (index 9*10+0=90)
    expect(container.querySelectorAll('.cell--preview-invalid').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.cell--preview-valid').length).toBe(0);
  });

  // ── line 113: handleCellClick early return when onCellClick absent ───────

  it('clicking a cell when no onCellClick is provided does not throw (line 113)', () => {
    // Render enemy board without a click handler — cells are not attackable,
    // but the onClick callback is still wired to handleCellClick which returns early.
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" />
    );
    const cells = container.querySelectorAll('.cell');
    expect(() => fireEvent.click(cells[0])).not.toThrow();
  });

  // ── line 118: outOfBounds branch in handleCellClick ─────────────────────

  it('clicking a cell whose vertical ship placement would go out of bounds triggers shake', () => {
    // A 3-cell vertical ship placed at row 9 covers rows 9,10,11 — out of bounds.
    // handleCellClick recomputes the geometry and triggers shake without hover.
    const { container } = render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="vertical"
        onCellClick={() => {}}
      />
    );
    const buttons = screen.getAllByRole('button', { name: 'Place ship' });
    // Button at index 90 = row 9, col 0
    fireEvent.click(buttons[90]);
    expect(container.querySelector('.board-grid--shake')).not.toBeNull();
  });

  it('clicking an out-of-bounds vertical placement does not call onCellClick', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid
        board={createBoard()}
        isOwn={true}
        phase="setup"
        setupShipSize={3}
        setupOrientation="vertical"
        onCellClick={onCellClick}
      />
    );
    const buttons = screen.getAllByRole('button', { name: 'Place ship' });
    fireEvent.click(buttons[90]); // row 9, col 0 — vertical 3-ship goes out of bounds
    expect(onCellClick).not.toHaveBeenCalled();
  });
});

// ─── Setup keyboard navigation ────────────────────────────────────────────────

describe('BoardGrid — setup keyboard navigation', () => {
  it('focuses cell (0,0) by default in setup mode', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={3} setupOrientation="horizontal" onCellClick={() => {}} />
    );
    expect(container.querySelectorAll('.cell--focused').length).toBe(1);
  });

  it('ArrowRight moves the cursor one column right', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal" onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const focused = container.querySelector('.cell--focused');
    // Cell at [0,1] is index 1 in the grid (0-based)
    const cells = container.querySelectorAll('.cell');
    expect(focused).toBe(cells[1]);
  });

  it('ArrowDown moves the cursor one row down', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal" onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    const focused = container.querySelector('.cell--focused');
    const cells = container.querySelectorAll('.cell');
    expect(focused).toBe(cells[10]);
  });

  it('Space calls onCellClick with current cursor position', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal" onCellClick={onCellClick} />
    );
    fireEvent.keyDown(window, { key: ' ' });
    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });

  it('Enter calls onCellClick with current cursor position', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal" onCellClick={onCellClick} />
    );
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });

  it('R key calls onRotate', () => {
    const onRotate = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={() => {}} onRotate={onRotate} />
    );
    fireEvent.keyDown(window, { key: 'r' });
    expect(onRotate).toHaveBeenCalledTimes(1);
  });

  it('cursor does not go below row 0 on ArrowUp from (0,0)', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal" onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    const cells = container.querySelectorAll('.cell');
    expect(container.querySelector('.cell--focused')).toBe(cells[0]);
  });

  it('keyboard nav is inactive when phase is not setup', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing"
        onCellClick={onCellClick} />
    );
    // Space on enemy playing board triggers click via enemy board handler, not setup handler
    // Just confirm no setup-specific behavior fires
    fireEvent.keyDown(window, { key: 'r' });
    // onCellClick not called by R (R only works in setup)
    expect(onCellClick).not.toHaveBeenCalled();
  });
});

// ─── revealShips ─────────────────────────────────────────────────────────────

describe('BoardGrid — revealShips', () => {
  it('shows hidden enemy ships when revealShips=true', () => {
    const { board } = (() => {
      let b = createBoard();
      const ship = createShip('Destroyer', 2);
      b = placeShip(b, ship, 2, 2, 'horizontal')!;
      return { board: b };
    })();

    const { container } = render(
      <BoardGrid board={board} isOwn={false} phase="gameover"
        revealShips={true} />
    );
    // The two ship cells should now have cell--ship class
    const shipCells = container.querySelectorAll('.cell--ship');
    expect(shipCells.length).toBe(2);
  });

  it('does not show hidden ships when revealShips=false', () => {
    let b = createBoard();
    const ship = createShip('Destroyer', 2);
    b = placeShip(b, ship, 2, 2, 'horizontal')!;

    const { container } = render(
      <BoardGrid board={b} isOwn={false} phase="gameover" revealShips={false} />
    );
    expect(container.querySelectorAll('.cell--ship').length).toBe(0);
  });

  it('still shows sunk ships regardless of revealShips', () => {
    // Attack and sink the destroyer
    let b = createBoard();
    const ship = createShip('Destroyer', 2);
    b = placeShip(b, ship, 2, 2, 'horizontal')!;
    const { board: b2 } = receiveAttack(b, 2, 2);
    const { board: b3 } = receiveAttack(b2, 2, 3);

    const { container } = render(
      <BoardGrid board={b3} isOwn={false} phase="gameover" revealShips={false} />
    );
    // Sunk cells use cell--sunk not cell--ship but should still show markers
    expect(container.querySelectorAll('.cell--sunk').length).toBe(2);
  });
});

// ─── difficultyChosen — keyboard disabled when overlay is active ──────────────

describe('BoardGrid — difficultyChosen prop disables setup keyboard nav', () => {
  it('does not show cursor or move it on ArrowRight when difficultyChosen=false', () => {
    const onCellClick = jest.fn();
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={onCellClick} difficultyChosen={false} />
    );
    // isSetupKeyboard=false → no cell--focused rendered at all
    expect(container.querySelector('.cell--focused')).toBeNull();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    // Still no focused cell after key event — keyboard is disabled
    expect(container.querySelector('.cell--focused')).toBeNull();
  });

  it('does not call onCellClick on Space when difficultyChosen=false', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={onCellClick} difficultyChosen={false} />
    );
    fireEvent.keyDown(window, { key: ' ' });
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it('does not call onRotate on R when difficultyChosen=false', () => {
    const onRotate = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={() => {}} onRotate={onRotate} difficultyChosen={false} />
    );
    fireEvent.keyDown(window, { key: 'r' });
    expect(onRotate).not.toHaveBeenCalled();
  });

  it('enables keyboard nav when difficultyChosen=true (default)', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={onCellClick} difficultyChosen={true} />
    );
    fireEvent.keyDown(window, { key: ' ' });
    expect(onCellClick).toHaveBeenCalledWith(0, 0);
  });
});

// ─── keyboard preview syncs hoverCell ────────────────────────────────────────

describe('BoardGrid — keyboard cursor syncs ship preview (hover follows cursor)', () => {
  it('shows preview cells at the cursor position after ArrowRight', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={() => {}} difficultyChosen={true} />
    );
    // Initially cursor is (0,0) — no preview shown yet (hoverCell null on mount)
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    // After ArrowRight cursor is (0,1) — hoverCell should be synced
    // For a size-2 horizontal ship at (0,1): cells are (0,1) and (0,2)
    const previews = container.querySelectorAll('.cell--preview-valid, .cell--preview-invalid');
    expect(previews.length).toBe(2);
  });

  it('preview updates when cursor moves ArrowDown', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="vertical"
        onCellClick={() => {}} difficultyChosen={true} />
    );
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // Cursor moves to (1,0); vertical size-2 ship at (1,0): cells (1,0) and (2,0)
    const previews = container.querySelectorAll('.cell--preview-valid, .cell--preview-invalid');
    expect(previews.length).toBe(2);
  });

  it('mouse entry recaptures hover from keyboard', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={() => {}} difficultyChosen={true} />
    );
    // Move keyboard cursor to (0,3)
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    // Mouse enters cell (0,7) — preview should move to (0,7)+(0,8)
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[7]); // row 0, col 7

    const previews = container.querySelectorAll('.cell--preview-valid, .cell--preview-invalid');
    // Size-2 horizontal from (0,7): cells 7 and 8
    expect(previews.length).toBe(2);
    expect(cells[7]).toHaveClass('cell--preview-valid');
    expect(cells[8]).toHaveClass('cell--preview-valid');
    expect(cells[3]).not.toHaveClass('cell--preview-valid');
  });
});

// ─── keyboard shake on invalid placement ─────────────────────────────────────

describe('BoardGrid — keyboard Space triggers shake on invalid placement', () => {
  it('shakes when Space is pressed with cursor at an out-of-bounds vertical position', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={3} setupOrientation="vertical"
        onCellClick={() => {}} difficultyChosen={true} />
    );
    // Move cursor to row 9 (index 90 in flat list) — size-3 vertical goes out of bounds
    for (let i = 0; i < 9; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: ' ' });
    expect(container.querySelector('.board-grid--shake')).not.toBeNull();
  });

  it('does not call onCellClick when Space pressed on invalid position', () => {
    const onCellClick = jest.fn();
    render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={3} setupOrientation="vertical"
        onCellClick={onCellClick} difficultyChosen={true} />
    );
    for (let i = 0; i < 9; i++) fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: ' ' });
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it('does not shake when Space pressed on valid position', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={true} phase="setup"
        setupShipSize={2} setupOrientation="horizontal"
        onCellClick={() => {}} difficultyChosen={true} />
    );
    // Cursor at (0,0) — size-2 horizontal fits fine
    fireEvent.keyDown(window, { key: ' ' });
    expect(container.querySelector('.board-grid--shake')).toBeNull();
  });
});

// ─── Enemy board keyboard/mouse sync ─────────────────────────────────────────

describe('BoardGrid — enemy board keyboard/mouse interaction', () => {
  it('keyboard ArrowRight moves cursor and only that cell is focused', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing"
        onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const focused = container.querySelector('.cell--focused');
    const cells   = container.querySelectorAll('.cell');
    expect(focused).toBe(cells[1]); // (0,1)
  });

  it('after keyboard is used, only the cursor cell is attackable', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing"
        onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // keyboard mode active
    const attackable = container.querySelectorAll('[role="button"]');
    // Only cursor cell (0,1) should be attackable in keyboard mode
    expect(attackable.length).toBe(1);
    const cells = container.querySelectorAll('.cell');
    expect(attackable[0]).toBe(cells[1]);
  });

  it('all attackable cells restored when mouse enters any cell', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing"
        onCellClick={() => {}} />
    );
    // Activate keyboard mode
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(container.querySelectorAll('[role="button"]').length).toBe(1);

    // Mouse enters a cell — mouse retakes control
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[5]);
    // All 100 empty cells are attackable again
    expect(container.querySelectorAll('[role="button"]').length).toBe(100);
  });

  it('cursor syncs to mouse cell after mouse enters', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing"
        onCellClick={() => {}} />
    );
    fireEvent.keyDown(window, { key: 'ArrowDown' }); // cursor → (1,0)
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[5]); // mouse enters (0,5)
    expect(container.querySelector('.cell--focused')).toBe(cells[5]);
  });

  it('keyboard moves cursor again after mouse but then keyboard takes over', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing"
        onCellClick={() => {}} />
    );
    const cells = container.querySelectorAll('.cell');
    fireEvent.mouseEnter(cells[5]); // mouse at (0,5)
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // keyboard → (0,6)
    // Only (0,6) is attackable/focused now
    expect(container.querySelectorAll('[role="button"]').length).toBe(1);
    expect(container.querySelector('.cell--focused')).toBe(cells[6]);
  });
});

// ─── Gameover/reveal: no keyboard or cursor ───────────────────────────────────

describe('BoardGrid — gameover reveal blocks keyboard and cursor', () => {
  it('no cell--focused when onCellClick is absent (reveal mode)', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing"
        revealShips={true} />
      // onCellClick omitted — simulates reveal where isPlayerTurn=false
    );
    expect(container.querySelector('.cell--focused')).toBeNull();
  });

  it('keyboard arrows do not move cursor when onCellClick is absent', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" />
    );
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(container.querySelector('.cell--focused')).toBeNull();
  });

  it('Space does not fire when onCellClick is absent', () => {
    // No error or action — just shouldn't throw
    render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" />
    );
    expect(() => fireEvent.keyDown(window, { key: ' ' })).not.toThrow();
  });

  it('no attackable cells rendered when onCellClick is absent', () => {
    const { container } = render(
      <BoardGrid board={createBoard()} isOwn={false} phase="playing" />
    );
    expect(container.querySelectorAll('[role="button"]').length).toBe(0);
  });
});