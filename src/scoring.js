/* =========================================================
   scoring.js

   Score = BaseScore - MovePenalty - TimePenalty - HintPenalty
   never less than 0.

   BaseScore rewards harder puzzles: size*size*100
     3x3 -> 900   4x4 -> 1600   5x5 -> 2500

   MovePenalty: 5 points per move. Efficient solves score higher.
   TimePenalty: 2 points per second. Faster solves score higher.
   HintPenalty: 50 points per hint used.
   ========================================================= */

export const MOVE_PENALTY_PER_MOVE = 5;
export const TIME_PENALTY_PER_SECOND = 2;
export const HINT_PENALTY_PER_HINT = 50;

export function baseScoreForSize(size) {
  return size * size * 100;
}

export function calculateScore({ size, moves, seconds, hintsUsed }) {
  const base = baseScoreForSize(size);
  const movePenalty = moves * MOVE_PENALTY_PER_MOVE;
  const timePenalty = seconds * TIME_PENALTY_PER_SECOND;
  const hintPenalty = hintsUsed * HINT_PENALTY_PER_HINT;
  const score = base - movePenalty - timePenalty - hintPenalty;
  return Math.max(0, Math.round(score));
}
