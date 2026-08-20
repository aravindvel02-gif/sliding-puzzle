# Slide — Sliding Puzzle Game

A polished, from-scratch sliding puzzle (15-puzzle style) built with plain HTML, CSS, and JavaScript — no framework, no build step, no backend.

## Run it

Because this uses ES modules (`import`/`export`), opening `index.html` directly with `file://` will be blocked by the browser's CORS rules. Serve it locally instead:

- **VS Code**: install the "Live Server" extension → right-click `index.html` → "Open with Live Server"
- **Python**: `python -m http.server 8000` in this folder, then visit `http://localhost:8000`
- **Node**: `npx serve .` in this folder

## Features

- 3×3 / 4×4 / 5×5 difficulty
- Guaranteed-solvable shuffle (see algorithm explanation below)
- Click, arrow-key, and swipe controls
- Move counter, timer, scoring formula
- Hint system (3 per game, highlights a helpful move)
- Undo (capped history so memory doesn't grow unbounded)
- Four visual themes (Classic numbers, Animals, Space, Fruits) plus a **custom image mode** — upload your own photo and it's sliced into tiles entirely in-browser, never uploaded anywhere
- Daily Puzzle — same 4×4 board for everyone each day, via a deterministic seeded shuffle
- Local statistics and a local leaderboard (per difficulty), both in LocalStorage
- Sound effects (synthesized with the Web Audio API — no audio files)
- Dark mode
- Fully responsive, keyboard-accessible, with visible focus states and an ARIA live region announcing moves/wins

## How the solvable shuffle works

A naive shuffle (`array.sort(() => Math.random() - 0.5)`) picks a uniformly random arrangement of tiles. The problem: **exactly half of all possible arrangements of a sliding puzzle are mathematically unsolvable** — no sequence of legal slides can ever reach the solved state from them. This is a known result based on permutation parity (counting "inversions" — pairs of tiles out of their relative order).

Instead of shuffling the array and hoping, this game starts from the **solved board** and performs hundreds of random **legal slides** — only ever moving a tile that's actually adjacent to the blank space, exactly like a real player scrambling the puzzle by hand. Since every move made during shuffling is itself reversible, the resulting scrambled board is *guaranteed* solvable — the guarantee comes from how the puzzle was built, not from checking it afterward.

This is implemented in `src/shuffle.js`, and verified independently in the test suite using the standard inversion-count parity theorem — 600 shuffled boards across all three sizes were checked and all passed.

## Scoring

```
Score = BaseScore − (Moves × 5) − (Seconds × 2) − (HintsUsed × 50)
```

- BaseScore rewards harder puzzles: `size × size × 100` (900 / 1600 / 2500)
- Never goes below 0

## Project structure

```
sliding-puzzle/
├── index.html
├── README.md
└── src/
    ├── style.css
    ├── main.js          — the only file that touches the DOM
    ├── puzzle.js         — board data structure, move rules, win check
    ├── shuffle.js         — solvable shuffle + seeded RNG for Daily Puzzle
    ├── scoring.js         — score formula
    ├── timer.js            — stopwatch
    ├── statistics.js       — LocalStorage-backed player stats
    ├── leaderboard.js      — LocalStorage-backed local leaderboard
    ├── themes.js           — tile theme definitions
    ├── sound.js            — Web Audio beeps
    └── storage.js          — thin LocalStorage wrapper
```

Logic and rendering are deliberately kept apart: every file except `main.js` is pure logic with no DOM access, which makes each one independently testable (see below).

## Testing

Core logic was verified with an automated test script covering: move validity, solvability of the shuffle (checked against the independent inversion-parity theorem, not just re-testing the same construction), win detection, daily-puzzle determinism (same date → same board, different date → different board), and score-formula edge cases (never negative, perfect-game score). Run it yourself:

```bash
node test.mjs
```

(if you'd like to keep this file — it isn't required for the game to run, only for verifying the logic).

## Data & privacy

Everything — statistics, leaderboard entries, theme/sound/dark-mode preferences, daily puzzle results — is stored in your browser's LocalStorage. Nothing is sent to a server. A custom puzzle image is held only in memory for the current session and is never uploaded or persisted.

## Known limitations / possible future improvements

- The hint system uses a greedy heuristic (picks the move that most reduces total distance-to-goal), not a full puzzle solver — it won't always suggest the objectively optimal move, especially on 5×5.
- The leaderboard is local to each browser/device; there's no shared/global leaderboard since there's no backend.
- Daily puzzle uses the player's local date, so players in different time zones may get a new puzzle at different real-world moments.
