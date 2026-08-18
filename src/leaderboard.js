/* =========================================================
   leaderboard.js — a per-difficulty top-10 list, stored locally.
   There's no server, so this leaderboard only reflects games
   played on this browser/device.
   ========================================================= */

import { getItem, setItem, KEYS } from "./storage.js";

const MAX_ENTRIES = 10;

function loadAll() {
  return getItem(KEYS.leaderboard, { 3: [], 4: [], 5: [] });
}

export function getLeaderboard(size) {
  const all = loadAll();
  return all[size] || [];
}

/** Returns true if this score would make the top 10 for its size. */
export function qualifiesForLeaderboard(size, score) {
  const list = getLeaderboard(size);
  if (list.length < MAX_ENTRIES) return true;
  return score > list[list.length - 1].score;
}

export function addLeaderboardEntry(size, entry) {
  const all = loadAll();
  const list = all[size] || [];
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  all[size] = list.slice(0, MAX_ENTRIES);
  setItem(KEYS.leaderboard, all);
  return all[size];
}
