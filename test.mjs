import { createSolvedBoard, canMoveTile, moveTile, isSolved, getMovableIndices, moveDirection } from "./puzzle.js";
import { shuffleBoard, mulberry32, seedFromDateString } from "./shuffle.js";
import { calculateScore } from "./scoring.js";

let failures = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); failures++; }
  else console.log("PASS:", msg);
}

// 1. Solved board is solved
assert(isSolved(createSolvedBoard(3)), "3x3 solved board detected as solved");
assert(isSolved(createSolvedBoard(4)), "4x4 solved board detected as solved");

// 2. Basic move validity: in solved 3x3 [1,2,3,4,5,6,7,8,0], blank at index 8 (row2,col2)
// Adjacent tiles: index 5 (value 6, row1,col2) and index 7 (value 8, row2,col1)
let b = createSolvedBoard(3);
assert(canMoveTile(b, 3, 5) === true, "tile adjacent to blank (index 5) is movable");
assert(canMoveTile(b, 3, 7) === true, "tile adjacent to blank (index 7) is movable");
assert(canMoveTile(b, 3, 0) === false, "tile far from blank (index 0) is not movable");

// 3. moveTile actually swaps
let moved = moveTile(b, 3, 7);
assert(moved[7] === 0 && moved[8] === 8, "moveTile swaps blank and tile correctly");
assert(moved !== b, "moveTile returns a new array on valid move");
let unchanged = moveTile(b, 3, 0);
assert(unchanged === b, "moveTile returns same reference on invalid move");

// 4. Solvability: every shuffled board must be solvable by simulating
//    that it was reached via legal moves (which is true by construction),
//    but let's verify by re-solving via BFS-lite reachability check for small size.
function isReachableSolvable(board, size) {
  // Use inversion-count parity test (standard 15-puzzle solvability theorem)
  // as an independent check against our construction-based shuffle.
  const tiles = board.filter(v => v !== 0);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++)
    for (let j = i + 1; j < tiles.length; j++)
      if (tiles[i] > tiles[j]) inversions++;

  const blankIndex = board.indexOf(0);
  const blankRowFromBottom = size - Math.floor(blankIndex / size);

  if (size % 2 === 1) {
    // odd grid width: solvable iff inversions is even
    return inversions % 2 === 0;
  } else {
    // even grid width: solvable iff (inversions + blankRowFromBottom) is odd
    return (inversions + blankRowFromBottom) % 2 === 1;
  }
}

for (const size of [3, 4, 5]) {
  let allSolvable = true;
  for (let trial = 0; trial < 200; trial++) {
    const board = shuffleBoard(size);
    if (!isReachableSolvable(board, size)) { allSolvable = false; break; }
  }
  assert(allSolvable, `200 random shuffles of size ${size} are all solvable (parity check)`);
}

// 5. Daily puzzle determinism
const seed1 = seedFromDateString("2026-08-17");
const seed2 = seedFromDateString("2026-08-17");
const boardA = shuffleBoard(4, 4*4*60, mulberry32(seed1));
const boardB = shuffleBoard(4, 4*4*60, mulberry32(seed2));
assert(JSON.stringify(boardA) === JSON.stringify(boardB), "same date produces identical daily puzzle");

const seed3 = seedFromDateString("2026-08-18");
const boardC = shuffleBoard(4, 4*4*60, mulberry32(seed3));
assert(JSON.stringify(boardA) !== JSON.stringify(boardC), "different date produces a different daily puzzle");

// 6. moveDirection sanity: moving into an edge does nothing
let solved4 = createSolvedBoard(3); // blank at bottom-right
let attemptOutOfBounds = moveDirection(solved4, 3, "down"); // blank already at bottom row, "down" target is out of grid
assert(attemptOutOfBounds === solved4, "moveDirection returns same board when target is out of bounds");

// 7. Scoring never negative
const scoreHuge = calculateScore({ size: 3, moves: 100000, seconds: 100000, hintsUsed: 3 });
assert(scoreHuge === 0, "score never goes negative even with huge penalties");
const scorePerfect = calculateScore({ size: 5, moves: 0, seconds: 0, hintsUsed: 0 });
assert(scorePerfect === 2500, "perfect 5x5 score equals base score (2500)");

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
