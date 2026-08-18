/* =========================================================
   shuffle.js — guarantees a solvable puzzle.

   WHY NOT JUST RANDOMIZE THE ARRAY?
   A sliding puzzle's solvability depends on "permutation parity" —
   every possible arrangement is mathematically either reachable from
   the solved state, or not. Roughly half of all random arrangements
   of numbers 1..N are UNSOLVABLE — no sequence of legal slides can
   ever untangle them. A plain `array.sort(() => Math.random() - 0.5)`
   ignores this completely and will hand players an impossible puzzle
   about 50% of the time.

   OUR FIX: instead of randomizing the array directly, we start from
   the SOLVED board and perform hundreds of random LEGAL slides (only
   ever moving a tile that's adjacent to the blank). Because every
   single move we make is a legal, reversible move, the scrambled
   result is — by construction — always reachable back to the solved
   state. No parity math needed; the guarantee comes from how we
   built the puzzle, not from checking it afterwards.
   ========================================================= */

import { createSolvedBoard, getMovableIndices, moveTile, getBlankIndex } from "./puzzle.js";

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Given the same seed, it always produces the same sequence of
 * numbers — this is what makes the Daily Puzzle identical for
 * every player on a given day.
 */
export function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a date string like "2026-08-17" into a stable numeric seed. */
export function seedFromDateString(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Shuffles by making `moveCount` random legal slides from the solved
 * board. `rng` defaults to Math.random but can be a seeded generator
 * for deterministic (Daily Puzzle) shuffles.
 */
export function shuffleBoard(size, moveCount = size * size * 60, rng = Math.random) {
  let board = createSolvedBoard(size);
  let lastBlankIndex = getBlankIndex(board);

  for (let i = 0; i < moveCount; i++) {
    const movable = getMovableIndices(board, size);
    // Avoid immediately undoing the previous move so the shuffle
    // doesn't wander in tiny useless loops.
    const options = movable.filter((idx) => idx !== lastBlankIndex);
    const pool = options.length > 0 ? options : movable;
    const choice = pool[Math.floor(rng() * pool.length)];
    lastBlankIndex = getBlankIndex(board);
    board = moveTile(board, size, choice);
  }

  return board;
}
