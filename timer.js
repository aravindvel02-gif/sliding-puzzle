/* =========================================================
   timer.js — a small stopwatch. Starts on first move, stops
   when the puzzle is solved.
   ========================================================= */

export function createTimer(onTick) {
  let startedAt = null;
  let elapsedMs = 0;
  let intervalId = null;

  function tick() {
    elapsedMs = Date.now() - startedAt;
    onTick(elapsedMs);
  }

  return {
    start() {
      if (intervalId) return; // already running
      startedAt = Date.now() - elapsedMs;
      intervalId = setInterval(tick, 250);
    },
    stop() {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    },
    reset() {
      this.stop();
      elapsedMs = 0;
      startedAt = null;
      onTick(0);
    },
    getElapsedMs() {
      return elapsedMs;
    },
    getElapsedSeconds() {
      return Math.floor(elapsedMs / 1000);
    },
  };
}

export function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
