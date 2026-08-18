/* =========================================================
   main.js — the only file that touches the DOM directly.
   Everything else (puzzle.js, shuffle.js, scoring.js, etc.)
   is plain logic with no knowledge of HTML.
   ========================================================= */

import {
  getBlankIndex, indexToRowCol, canMoveTile, moveTile, moveDirection,
  isSolved, totalManhattanDistance, getMovableIndices,
} from "./puzzle.js";
import { shuffleBoard, mulberry32, seedFromDateString } from "./shuffle.js";
import { createTimer, formatTime } from "./timer.js";
import { calculateScore } from "./scoring.js";
import { getItem, setItem, KEYS } from "./storage.js";
import { recordGameStarted, recordGameCompleted, loadStatistics, getBestTimeForSize } from "./statistics.js";
import { getLeaderboard, qualifiesForLeaderboard, addLeaderboardEntry } from "./leaderboard.js";
import { THEMES, getTileDisplay } from "./themes.js";
import { Sound, setSoundEnabled } from "./sound.js";

/* ---------- DOM references ---------- */
const el = (id) => document.getElementById(id);

const setupScreen = el("setupScreen");
const gameScreen = el("gameScreen");
const difficultyGrid = el("difficultyGrid");
const themeGrid = el("themeGrid");
const imageInput = el("imageInput");
const imageFileName = el("imageFileName");
const clearImageBtn = el("clearImageBtn");
const dailyDate = el("dailyDate");
const dailyBest = el("dailyBest");
const dailyPlayBtn = el("dailyPlayBtn");
const startGameBtn = el("startGameBtn");

const board = el("board");
const hudMoves = el("hudMoves");
const hudTime = el("hudTime");
const hudBest = el("hudBest");
const hudHints = el("hudHints");
const difficultyFlag = el("difficultyFlag");
const liveRegion = el("liveRegion");

const newGameBtn = el("newGameBtn");
const hintBtn = el("hintBtn");
const undoBtn = el("undoBtn");
const menuBtn = el("menuBtn");

const winModal = el("winModal");
const winTime = el("winTime");
const winMoves = el("winMoves");
const winScore = el("winScore");
const winRecord = el("winRecord");
const nameEntry = el("nameEntry");
const playerName = el("playerName");
const saveScoreBtn = el("saveScoreBtn");
const winMenuBtn = el("winMenuBtn");
const winPlayAgainBtn = el("winPlayAgainBtn");

const statsBtn = el("statsBtn");
const statsModal = el("statsModal");
const statsList = el("statsList");
const closeStatsBtn = el("closeStatsBtn");

const leaderboardBtn = el("leaderboardBtn");
const leaderboardModal = el("leaderboardModal");
const leaderboardTabs = el("leaderboardTabs");
const leaderboardList = el("leaderboardList");
const closeLeaderboardBtn = el("closeLeaderboardBtn");

const soundBtn = el("soundBtn");
const themeToggleBtn = el("themeToggleBtn");

/* ---------- App state ---------- */
const HINT_LIMIT = 3;
const HISTORY_LIMIT = 200;

const state = {
  size: 3,
  board: [],
  moves: 0,
  hintsRemaining: HINT_LIMIT,
  hintsUsed: 0,
  history: [],
  isDaily: false,
  dailyDateStr: null,
  tileTheme: "classic",
  customImage: null, // { dataUrl } or null
  pendingScore: 0,
  tileElements: new Map(), // value -> DOM element (persisted across renders for animation)
};

const timer = createTimer((ms) => {
  hudTime.textContent = formatTime(ms);
});

/* ---------- Setup screen: difficulty selection ---------- */
difficultyGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".difficulty-card");
  if (!card) return;
  Sound.click();
  [...difficultyGrid.children].forEach((c) => c.setAttribute("aria-checked", "false"));
  card.setAttribute("aria-checked", "true");
  state.size = Number(card.dataset.size);
});

/* ---------- Setup screen: theme selection ---------- */
function buildThemeGrid() {
  themeGrid.innerHTML = "";
  Object.entries(THEMES).forEach(([key, theme], i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card";
    card.dataset.theme = key;
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", key === state.tileTheme ? "true" : "false");
    card.innerHTML = `<span class="theme-preview">${theme.preview}</span><span class="theme-name">${theme.label}</span>`;
    themeGrid.appendChild(card);
  });
}
buildThemeGrid();

themeGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".theme-card");
  if (!card) return;
  Sound.click();
  state.tileTheme = card.dataset.theme;
  state.customImage = null; // switching to an emoji/number theme drops the custom image
  imageFileName.textContent = "";
  clearImageBtn.hidden = true;
  [...themeGrid.children].forEach((c) => c.setAttribute("aria-checked", "false"));
  card.setAttribute("aria-checked", "true");
});

/* ---------- Setup screen: custom image upload ---------- */
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    // The image never leaves the browser — we only hold the data URL in memory.
    state.customImage = { dataUrl: reader.result };
    imageFileName.textContent = file.name;
    clearImageBtn.hidden = false;
    [...themeGrid.children].forEach((c) => c.setAttribute("aria-checked", "false"));
  };
  reader.readAsDataURL(file);
});

clearImageBtn.addEventListener("click", () => {
  state.customImage = null;
  imageInput.value = "";
  imageFileName.textContent = "";
  clearImageBtn.hidden = true;
});

/* ---------- Setup screen: daily puzzle ---------- */
function todayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function refreshDailyPanel() {
  const dateStr = todayDateString();
  const pretty = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  dailyDate.textContent = pretty;
  const bests = getItem(KEYS.dailyBest, {});
  const best = bests[dateStr];
  dailyBest.textContent = best ? `Your best today: ${formatTime(best.timeMs)} in ${best.moves} moves` : "Not attempted yet today";
}
refreshDailyPanel();

dailyPlayBtn.addEventListener("click", () => {
  Sound.click();
  startGame({ size: 4, isDaily: true });
});

startGameBtn.addEventListener("click", () => {
  Sound.click();
  startGame({ size: state.size, isDaily: false });
});

/* ---------- Starting a game ---------- */
function startGame({ size, isDaily }) {
  state.size = size;
  state.isDaily = isDaily;
  state.dailyDateStr = isDaily ? todayDateString() : null;
  state.moves = 0;
  state.hintsRemaining = HINT_LIMIT;
  state.hintsUsed = 0;
  state.history = [];

  if (isDaily) {
    const seed = seedFromDateString(state.dailyDateStr);
    state.board = shuffleBoard(size, size * size * 60, mulberry32(seed));
  } else {
    state.board = shuffleBoard(size);
  }

  timer.reset();

  buildBoardDOM();
  updateHUD();
  difficultyFlag.textContent = isDaily
    ? `Daily puzzle · ${size}×${size} · ${state.dailyDateStr}`
    : `${size === 3 ? "Easy" : size === 4 ? "Medium" : "Hard"} · ${size}×${size}`;

  recordGameStarted(size);

  setupScreen.hidden = true;
  gameScreen.hidden = false;
  winModal.hidden = true;
}

/* ---------- Building & rendering the board (with slide animation) ---------- */
function buildBoardDOM() {
  board.innerHTML = "";
  board.style.setProperty("--size", state.size);
  state.tileElements = new Map();

  const total = state.size * state.size;
  for (let value = 1; value < total; value++) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile";
    tile.setAttribute("role", "gridcell");
    applyTileAppearance(tile, value);
    tile.addEventListener("click", () => {
      const currentIndex = state.board.indexOf(value);
      attemptMoveByIndex(currentIndex);
    });
    state.tileElements.set(value, tile);
    board.appendChild(tile);
  }
  renderBoard();
}

function applyTileAppearance(tile, value) {
  if (state.customImage) {
    const goalIndex = value - 1;
    const { row, col } = indexToRowCol(goalIndex, state.size);
    tile.textContent = "";
    tile.style.backgroundImage = `url(${state.customImage.dataUrl})`;
    tile.style.backgroundSize = `${state.size * 100}% ${state.size * 100}%`;
    const step = state.size > 1 ? 100 / (state.size - 1) : 0;
    tile.style.backgroundPosition = `${col * step}% ${row * step}%`;
  } else {
    tile.style.backgroundImage = "none";
    tile.textContent = getTileDisplay(state.tileTheme, value, state.size);
  }
  tile.setAttribute("aria-label", state.customImage ? `Puzzle piece ${value}` : `Tile ${tile.textContent}`);
}

function renderBoard() {
  state.tileElements.forEach((tileEl, value) => {
    const index = state.board.indexOf(value);
    const { row, col } = indexToRowCol(index, state.size);
    tileEl.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
  });
}

/* ---------- HUD ---------- */
function updateHUD() {
  hudMoves.textContent = state.moves;
  hudHints.textContent = state.hintsRemaining;
  const best = state.isDaily ? null : getBestTimeForSize(state.size);
  hudBest.textContent = best !== null ? formatTime(best * 1000) : "—";
  undoBtn.disabled = state.history.length === 0;
}

/* ---------- Move handling (shared commit path) ---------- */
function commitMove(nextBoard, movedValue) {
  if (nextBoard === state.board) return; // invalid move, nothing changed

  state.history.push(state.board);
  if (state.history.length > HISTORY_LIMIT) state.history.shift();

  state.board = nextBoard;
  state.moves += 1;

  if (state.moves === 1) timer.start();

  Sound.move();
  renderBoard();
  updateHUD();

  if (movedValue !== undefined) {
    const tileEl = state.tileElements.get(movedValue);
    if (tileEl) {
      tileEl.classList.remove("just-moved");
      // eslint-disable-next-line no-unused-expressions
      tileEl.offsetWidth; // restart the CSS animation
      tileEl.classList.add("just-moved");
    }
  }

  if (isSolved(state.board)) {
    handleWin();
  }
}

function attemptMoveByIndex(tileIndex) {
  const movedValue = state.board[tileIndex];
  const next = moveTile(state.board, state.size, tileIndex);
  commitMove(next, movedValue);
}

function attemptMoveByDirection(direction) {
  const blankIndex = getBlankIndex(state.board);
  const { row, col } = indexToRowCol(blankIndex, state.size);
  let targetRow = row, targetCol = col;
  if (direction === "up") targetRow -= 1;
  if (direction === "down") targetRow += 1;
  if (direction === "left") targetCol -= 1;
  if (direction === "right") targetCol += 1;
  if (targetRow < 0 || targetRow >= state.size || targetCol < 0 || targetCol >= state.size) return;
  const tileIndex = targetRow * state.size + targetCol;
  attemptMoveByIndex(tileIndex);
}

/* ---------- Keyboard controls ---------- */
document.addEventListener("keydown", (e) => {
  if (gameScreen.hidden) return;
  const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const direction = map[e.key];
  if (!direction) return;
  e.preventDefault();
  attemptMoveByDirection(direction);
});

/* ---------- Touch / swipe controls ---------- */
let touchStartX = 0, touchStartY = 0;
board.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

board.addEventListener("touchend", (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const threshold = 24;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    attemptMoveByDirection(dx > 0 ? "right" : "left");
  } else {
    attemptMoveByDirection(dy > 0 ? "down" : "up");
  }
}, { passive: true });

/* ---------- New game / Undo / Hint / Menu ---------- */
newGameBtn.addEventListener("click", () => {
  Sound.click();
  startGame({ size: state.size, isDaily: state.isDaily });
});

undoBtn.addEventListener("click", () => {
  if (state.history.length === 0) return;
  Sound.click();
  state.board = state.history.pop();
  state.moves = Math.max(0, state.moves - 1);
  renderBoard();
  updateHUD();
});

hintBtn.addEventListener("click", () => {
  if (state.hintsRemaining <= 0) {
    liveRegion.textContent = "No hints remaining.";
    return;
  }
  const movable = getMovableIndices(state.board, state.size);
  let best = null;
  let bestDistance = Infinity;
  movable.forEach((idx) => {
    const hypothetical = moveTile(state.board, state.size, idx);
    const distance = totalManhattanDistance(hypothetical, state.size);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = idx;
    }
  });
  if (best === null) return;

  const value = state.board[best];
  const tileEl = state.tileElements.get(value);
  if (tileEl) {
    tileEl.classList.add("movable-hint");
    setTimeout(() => tileEl.classList.remove("movable-hint"), 1400);
  }

  state.hintsRemaining -= 1;
  state.hintsUsed += 1;
  updateHUD();
  Sound.hint();
  liveRegion.textContent = "Hint: try moving the highlighted tile.";
});

menuBtn.addEventListener("click", () => {
  timer.stop();
  gameScreen.hidden = true;
  setupScreen.hidden = false;
  refreshDailyPanel();
});

/* ---------- Winning ---------- */
function handleWin() {
  timer.stop();
  const seconds = timer.getElapsedSeconds();
  const score = calculateScore({ size: state.size, moves: state.moves, seconds, hintsUsed: state.hintsUsed });
  state.pendingScore = score;

  const prevBest = getBestTimeForSize(state.size);
  const stats = recordGameCompleted({ size: state.size, moves: state.moves, seconds, score });
  const isNewBest = prevBest === null || seconds < prevBest;

  if (state.isDaily) {
    const bests = getItem(KEYS.dailyBest, {});
    const existing = bests[state.dailyDateStr];
    if (!existing || timer.getElapsedMs() < existing.timeMs) {
      bests[state.dailyDateStr] = { timeMs: timer.getElapsedMs(), moves: state.moves };
      setItem(KEYS.dailyBest, bests);
    }
  }

  winTime.textContent = formatTime(timer.getElapsedMs());
  winMoves.textContent = state.moves;
  winScore.textContent = score.toLocaleString();
  winRecord.hidden = !isNewBest;

  if (isNewBest) Sound.record(); else Sound.win();

  const qualifies = qualifiesForLeaderboard(state.size, score);
  nameEntry.hidden = !qualifies;
  if (qualifies) playerName.value = "";

  winModal.hidden = false;
  liveRegion.textContent = `Puzzle solved in ${state.moves} moves and ${formatTime(timer.getElapsedMs())}.`;
}

saveScoreBtn.addEventListener("click", () => {
  const name = playerName.value.trim() || "Anonymous";
  addLeaderboardEntry(state.size, {
    name,
    score: state.pendingScore,
    time: timer.getElapsedSeconds(),
    moves: state.moves,
    difficulty: state.size,
    date: todayDateString(),
  });
  nameEntry.hidden = true;
  Sound.click();
});

winPlayAgainBtn.addEventListener("click", () => {
  Sound.click();
  startGame({ size: state.size, isDaily: state.isDaily });
});

winMenuBtn.addEventListener("click", () => {
  winModal.hidden = true;
  gameScreen.hidden = true;
  setupScreen.hidden = false;
  refreshDailyPanel();
});

/* ---------- Stats modal ---------- */
statsBtn.addEventListener("click", () => {
  const stats = loadStatistics();
  const avgMoves = stats.gamesCompleted ? Math.round(stats.totalMoves / stats.gamesCompleted) : 0;
  const avgTime = stats.gamesCompleted ? Math.round(stats.totalSeconds / stats.gamesCompleted) : 0;

  const rows = [
    ["Games played", stats.gamesPlayed],
    ["Games completed", stats.gamesCompleted],
    ["Highest score", stats.highestScore.toLocaleString()],
    ["Average moves", avgMoves],
    ["Average time", formatTime(avgTime * 1000)],
  ];
  [3, 4, 5].forEach((size) => {
    const bucket = stats.byDifficulty[size];
    rows.push([`Best time (${size}×${size})`, bucket.bestTime !== null ? formatTime(bucket.bestTime * 1000) : "—"]);
    rows.push([`Best moves (${size}×${size})`, bucket.bestMoves !== null ? bucket.bestMoves : "—"]);
  });

  statsList.innerHTML = rows.map(([label, value]) => `
    <div class="stats-row"><span>${label}</span><strong>${value}</strong></div>
  `).join("");
  statsModal.hidden = false;
});
closeStatsBtn.addEventListener("click", () => { statsModal.hidden = true; });

/* ---------- Leaderboard modal ---------- */
function renderLeaderboard(size) {
  const list = getLeaderboard(size);
  if (list.length === 0) {
    leaderboardList.innerHTML = `<li class="leaderboard-empty">No scores yet for ${size}×${size} — be the first!</li>`;
    return;
  }
  leaderboardList.innerHTML = list.map((entry, i) => `
    <li>
      <span class="lb-rank">${i + 1}</span>
      <span class="lb-name">${escapeHtml(entry.name)}</span>
      <span class="lb-score">${entry.score.toLocaleString()}</span>
    </li>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

leaderboardBtn.addEventListener("click", () => {
  leaderboardModal.hidden = false;
  const activeTab = leaderboardTabs.querySelector(".lb-tab.active");
  renderLeaderboard(Number(activeTab.dataset.size));
});
leaderboardTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".lb-tab");
  if (!tab) return;
  [...leaderboardTabs.children].forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");
  renderLeaderboard(Number(tab.dataset.size));
});
closeLeaderboardBtn.addEventListener("click", () => { leaderboardModal.hidden = true; });

/* ---------- Sound & dark mode toggles ---------- */
function applySoundIcon(enabled) {
  soundBtn.textContent = enabled ? "🔊" : "🔇";
}
let soundEnabled = getItem(KEYS.sound, true);
applySoundIcon(soundEnabled);

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  setSoundEnabled(soundEnabled);
  applySoundIcon(soundEnabled);
});

function applyColorTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  setItem(KEYS.theme, theme);
}
applyColorTheme(getItem(KEYS.theme, "light"));

themeToggleBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyColorTheme(current === "dark" ? "light" : "dark");
});

/* ---------- Close modals on overlay click / Escape ---------- */
[winModal, statsModal, leaderboardModal].forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  [winModal, statsModal, leaderboardModal].forEach((m) => { m.hidden = true; });
});
