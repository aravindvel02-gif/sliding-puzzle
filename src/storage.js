/* =========================================================
   storage.js — thin wrapper around LocalStorage so the rest
   of the app never touches JSON.parse/stringify directly.
   ========================================================= */

const PREFIX = "slide_";

export const KEYS = {
  theme: PREFIX + "theme",
  tileTheme: PREFIX + "tile_theme",
  sound: PREFIX + "sound",
  statistics: PREFIX + "statistics",
  leaderboard: PREFIX + "leaderboard",
  dailyBest: PREFIX + "daily_best",
  customImage: PREFIX + "custom_image",
};

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // LocalStorage can throw if the quota is exceeded (e.g. a very
    // large custom image). We fail quietly rather than crash the game.
    return false;
  }
}

export function removeItem(key) {
  localStorage.removeItem(key);
}
