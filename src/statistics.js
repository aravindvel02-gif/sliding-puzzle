/* =========================================================
   statistics.js — cumulative player stats, persisted locally.
   ========================================================= */

import { getItem, setItem, KEYS } from "./storage.js";

function defaultStats() {
  return {
    gamesPlayed: 0,
    gamesCompleted: 0,
    highestScore: 0,
    totalMoves: 0,
    totalSeconds: 0,
    byDifficulty: {
      3: { played: 0, completed: 0, bestTime: null, bestMoves: null },
      4: { played: 0, completed: 0, bestTime: null, bestMoves: null },
      5: { played: 0, completed: 0, bestTime: null, bestMoves: null },
    },
  };
}

export function loadStatistics() {
  return getItem(KEYS.statistics, defaultStats());
}

export function recordGameStarted(size) {
  const stats = loadStatistics();
  stats.gamesPlayed += 1;
  stats.byDifficulty[size].played += 1;
  setItem(KEYS.statistics, stats);
}

export function recordGameCompleted({ size, moves, seconds, score }) {
  const stats = loadStatistics();
  stats.gamesCompleted += 1;
  stats.totalMoves += moves;
  stats.totalSeconds += seconds;
  stats.highestScore = Math.max(stats.highestScore, score);

  const bucket = stats.byDifficulty[size];
  bucket.completed += 1;
  bucket.bestTime = bucket.bestTime === null ? seconds : Math.min(bucket.bestTime, seconds);
  bucket.bestMoves = bucket.bestMoves === null ? moves : Math.min(bucket.bestMoves, moves);

  setItem(KEYS.statistics, stats);
  return stats;
}

export function getBestTimeForSize(size) {
  const stats = loadStatistics();
  return stats.byDifficulty[size]?.bestTime ?? null;
}
