/* =========================================================
   sound.js — short synthesized beeps via the Web Audio API.
   No .mp3/.wav files to download, which keeps this a true
   zero-asset, zero-dependency project.
   ========================================================= */

import { getItem, setItem, KEYS } from "./storage.js";

let audioCtx = null;

function getContext() {
  // Browsers require a user gesture before audio can play, so we
  // create the AudioContext lazily on the first call (which will
  // always happen inside a click/keydown handler).
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

function isSoundEnabled() {
  return getItem(KEYS.sound, true);
}

export function setSoundEnabled(enabled) {
  setItem(KEYS.sound, enabled);
}

function beep(frequency, durationMs, type = "sine", volume = 0.15) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Some browsers block audio until a real user gesture; fail silently.
  }
}

export const Sound = {
  move: () => beep(440, 90, "square", 0.08),
  click: () => beep(320, 60, "sine", 0.08),
  hint: () => beep(660, 140, "triangle", 0.1),
  win: () => {
    beep(523, 120);
    setTimeout(() => beep(659, 120), 120);
    setTimeout(() => beep(784, 220), 240);
  },
  record: () => {
    beep(784, 100);
    setTimeout(() => beep(988, 100), 100);
    setTimeout(() => beep(1175, 260), 200);
  },
};
