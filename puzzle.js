/* =========================================================
   puzzle.js — pure puzzle logic (no DOM here on purpose).
   The board is a flat array. Index 0 in the array is the
   top-left cell; index (size*size - 1) is bottom-right.
   The value 0 always represents the blank space.
   ========================================================= */

/** Returns a solved board for the given size, e.g. size=3 -> [1,2,3,4,5,6,7,8,0] */
export function createSolvedBoard(size) {
  const total = size * size;
  const board = [];
  for (let i = 1; i < total; i++) board.push(i);
  board.push(0);
  return board;
}

export function getBlankIndex(board) {
  return board.indexOf(0);
}

export function indexToRowCol(index, size) {
  return { row: Math.floor(index / size), col: index % size };
}

export function rowColToIndex(row, col, size) {
  return row * size + col;
}

/**
 * A tile can move only if it is directly adjacent (up/down/left/right,
 * never diagonal) to the blank space. We check this by comparing
 * row/col rather than raw index, because index neighbors like
 * "index - 1" can secretly wrap to the previous row.
 */
export function canMoveTile(board, size, tileIndex) {
  const blankIndex = getBlankIndex(board);
  const a = indexToRowCol(tileIndex, size);
  const b = indexToRowCol(blankIndex, size);
  const rowDiff = Math.abs(a.row - b.row);
  const colDiff = Math.abs(a.col - b.col);
  // Adjacent means exactly one step away on exactly one axis.
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

/**
 * Attempts to move the tile at tileIndex into the blank space.
 * Returns a NEW board array if the move is valid, or the same
 * board reference (unchanged) if the move is invalid.
 */
export function moveTile(board, size, tileIndex) {
  if (!canMoveTile(board, size, tileIndex)) return board;
  const blankIndex = getBlankIndex(board);
  const next = board.slice();
  next[blankIndex] = next[tileIndex];
  next[tileIndex] = 0;
  return next;
}

/** Returns the board indices of tiles that are currently movable. */
export function getMovableIndices(board, size) {
  const blankIndex = getBlankIndex(board);
  const { row, col } = indexToRowCol(blankIndex, size);
  const candidates = [
    { row: row - 1, col }, // above blank
    { row: row + 1, col }, // below blank
    { row, col: col - 1 }, // left of blank
    { row, col: col + 1 }, // right of blank
  ];
  return candidates
    .filter((c) => c.row >= 0 && c.row < size && c.col >= 0 && c.col < size)
    .map((c) => rowColToIndex(c.row, c.col, size));
}

/**
 * Moves the neighbor of the blank in a given direction.
 * direction is 'up' | 'down' | 'left' | 'right' and describes which
 * neighboring tile slides INTO the blank (e.g. 'left' moves the tile
 * to the left of the blank into the gap — like pulling it rightward).
 */
export function moveDirection(board, size, direction) {
  const blankIndex = getBlankIndex(board);
  const { row, col } = indexToRowCol(blankIndex, size);
  let target;
  if (direction === "up") target = { row: row - 1, col };
  if (direction === "down") target = { row: row + 1, col };
  if (direction === "left") target = { row, col: col - 1 };
  if (direction === "right") target = { row, col: col + 1 };
  if (!target || target.row < 0 || target.row >= size || target.col < 0 || target.col >= size) {
    return board;
  }
  const tileIndex = rowColToIndex(target.row, target.col, size);
  return moveTile(board, size, tileIndex);
}

export function isSolved(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
}

/**
 * Manhattan distance heuristic: how many rows+cols each tile is away
 * from its goal position, summed. Used by the hint system to guess
 * which move is "helpful" without doing a full solve.
 */
export function totalManhattanDistance(board, size) {
  let total = 0;
  for (let i = 0; i < board.length; i++) {
    const value = board[i];
    if (value === 0) continue;
    const goalIndex = value - 1;
    const current = indexToRowCol(i, size);
    const goal = indexToRowCol(goalIndex, size);
    total += Math.abs(current.row - goal.row) + Math.abs(current.col - goal.col);
  }
  return total;
}
