const WIDTH = 320;
const HEIGHT = 180;
const MODES = ["ready", "playing", "paused", "victory"];
const INPUT = { KeyW: 1, ArrowUp: 1, KeyS: 2, ArrowDown: 2, KeyA: 4, KeyD: 8, ArrowLeft: 16, ArrowRight: 32 };
const MESSAGES = [
  "Find three light shards, then awaken the beacon in the north.",
  "Mira: First Light has always guided travelers. Its beacon needs three shards to shine again.",
  "Tavi: I saw a golden glint beyond the eastern roofs. The city is small—follow the open lanes.",
  "Orin: The shore paths are quiet today. Check the old trees and the southeastern dock.",
  "Light shard recovered. It hums softly in your pack.",
  "The beacon is dormant. Bring all three light shards to wake it.",
  "First Light shines again. The harbor paths are open, and the residents have a beacon to guide them home.",
  "Nothing is close enough. Move nearer and face a resident, shard, or the beacon.",
];

const root = document.querySelector("#blockbound-game");
const canvas = document.querySelector("#city-canvas");
const view = document.querySelector("#city-view");
const context = canvas.getContext("2d", { alpha: false });
const action = document.querySelector("#game-action");
const soundButton = document.querySelector("#sound");
const restart = document.querySelector("#restart");
const restartDialog = document.querySelector("#restart-dialog");
const overlay = document.querySelector("#city-overlay");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const dialogue = document.querySelector("#dialogue-text");
const prompt = document.querySelector("#interaction-prompt");
const status = document.querySelector("#game-status");
const shards = document.querySelector("#shard-count");
const residents = document.querySelector("#resident-count");
const objective = document.querySelector("#objective");
const keys = new Set();
const pointers = new Map();
let wasm;
let image;
let previousTime = 0;
let accumulator = 0;
let dirty = true;
let animation = 0;
let lastMode = -1;
let lastMessage = -1;
let lastShards = -1;
let lastResidents = -1;
let lastNearby = -1;
let audioContext;
let masterGain;
let soundEnabled = false;
let audioFailed = false;

try {
  soundEnabled = localStorage.getItem("blockbound.audio.v1") === "on";
} catch (_) {
  soundEnabled = false;
}

function syncSoundButton() {
  soundButton.textContent = soundEnabled ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
}

function ensureAudio() {
  if (!soundEnabled || audioFailed) return;
  try {
    if (!audioContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("Web Audio unavailable");
      audioContext = new Audio();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.16;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  } catch (_) {
    audioFailed = true;
    soundEnabled = false;
    syncSoundButton();
  }
}

function beep(frequency, duration = 0.09) {
  if (!soundEnabled || audioFailed) return;
  ensureAudio();
  if (!audioContext || !masterGain) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.15, now + duration);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.45, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function inputFlags() {
  let flags = 0;
  for (const flag of keys) flags |= flag;
  for (const flag of pointers.values()) flags |= flag;
  return flags;
}

function syncInput() {
  if (wasm) wasm.bb_set_input(inputFlags());
}

function clearInput() {
  keys.clear();
  pointers.clear();
  syncInput();
}

function pause() {
  if (wasm && wasm.bb_mode() === 1) {
    clearInput();
    wasm.bb_toggle_pause();
    dirty = true;
  }
}

function begin() {
  if (!wasm) return;
  const mode = wasm.bb_mode();
  if (mode === 0 || mode === 3) {
    wasm.bb_start();
    beep(392, 0.14);
  } else {
    wasm.bb_toggle_pause();
  }
  clearInput();
  ensureAudio();
  dirty = true;
  view.focus({ preventScroll: true });
}

function interact() {
  if (!wasm || wasm.bb_mode() !== 1) return;
  wasm.bb_interact();
  const message = wasm.bb_message();
  beep(message === 4 ? 660 : message === 6 ? 523 : 340, message === 6 ? 0.25 : 0.08);
  dirty = true;
}

function updateOverlay(mode) {
  overlay.hidden = mode === 1;
  if (mode === 0) {
    overlayKicker.textContent = "AN ORIGINAL BLOCK-BUILT ADVENTURE";
    overlayTitle.textContent = "First Light needs you.";
    overlayCopy.textContent = "Explore the harbor, meet three residents, and return their lost light to the beacon.";
    action.textContent = "Start exploring";
  } else if (mode === 2) {
    overlayKicker.textContent = "A MOMENT BY THE HARBOR";
    overlayTitle.textContent = "Walk paused.";
    overlayCopy.textContent = "Your place in First Light is safe. Resume whenever you are ready.";
    action.textContent = "Resume walk";
  } else if (mode === 3) {
    overlayKicker.textContent = "THE BEACON BURNS BRIGHT";
    overlayTitle.textContent = "First Light restored.";
    overlayCopy.textContent = "All three shards are home. Thanks for walking these little streets.";
    action.textContent = "Explore again";
  } else {
    action.textContent = "Pause";
  }
}

function updateHud() {
  const mode = wasm.bb_mode();
  const message = wasm.bb_message();
  const shardCount = wasm.bb_shards();
  const residentCount = wasm.bb_talked_count();
  const nearby = wasm.bb_nearby();
  if (mode !== lastMode) {
    root.dataset.state = MODES[mode];
    updateOverlay(mode);
    status.textContent = mode === 0 ? "Ready when you are." : mode === 1 ? "Exploring First Light." : mode === 2 ? "Walk paused." : "Beacon restored. Walk complete.";
    lastMode = mode;
    dirty = true;
  }
  if (message !== lastMessage) {
    dialogue.textContent = MESSAGES[message] || MESSAGES[0];
    lastMessage = message;
  }
  if (shardCount !== lastShards) {
    shards.textContent = String(shardCount);
    objective.textContent = shardCount === 3 ? "Return to the northern beacon" : `Find ${3 - shardCount} remaining light ${3 - shardCount === 1 ? "shard" : "shards"}`;
    lastShards = shardCount;
  }
  if (residentCount !== lastResidents) {
    residents.textContent = String(residentCount);
    lastResidents = residentCount;
  }
  if (nearby !== lastNearby) {
    const kind = ((nearby >> 8) & 255) - 1;
    prompt.textContent = nearby === 0 ? "" : kind === 0 ? "E / SPACE · TALK" : kind === 1 ? "E / SPACE · COLLECT" : "E / SPACE · USE BEACON";
    lastNearby = nearby;
  }
}

function frame(time) {
  const elapsed = Math.min((time - previousTime) / 1000 || 0, 0.1);
  previousTime = time;
  if (wasm.bb_mode() === 1) {
    accumulator += elapsed;
    while (accumulator >= 1 / 60) {
      wasm.bb_step(1 / 60);
      accumulator -= 1 / 60;
    }
    dirty = true;
  } else {
    accumulator = 0;
  }
  updateHud();
  if (dirty) {
    wasm.bb_render();
    context.putImageData(image, 0, 0);
    dirty = false;
  }
  animation = requestAnimationFrame(frame);
}

function editable(target) {
  return target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable);
}

window.addEventListener("keydown", (event) => {
  if (editable(event.target) || restartDialog.open || !wasm) return;
  if (INPUT[event.code]) {
    if (wasm.bb_mode() === 1) {
      keys.add(INPUT[event.code]);
      syncInput();
      event.preventDefault();
    }
  } else if ((event.code === "KeyE" || event.code === "Space") && !event.repeat) {
    if (wasm.bb_mode() === 1) interact();
    else if (wasm.bb_mode() === 0 || wasm.bb_mode() === 3) begin();
    event.preventDefault();
  } else if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat) {
    pause();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (INPUT[event.code]) {
    keys.delete(INPUT[event.code]);
    syncInput();
  }
});

for (const button of document.querySelectorAll("[data-input]")) {
  button.addEventListener("pointerdown", (event) => {
    if (!wasm || wasm.bb_mode() !== 1) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, Number(button.dataset.input));
    syncInput();
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    syncInput();
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

document.querySelector("#touch-interact").addEventListener("click", interact);
action.addEventListener("click", begin);
soundButton.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  audioFailed = false;
  try {
    localStorage.setItem("blockbound.audio.v1", soundEnabled ? "on" : "off");
  } catch (_) {}
  syncSoundButton();
  if (soundEnabled) {
    ensureAudio();
    beep(440);
  }
});
restart.addEventListener("click", () => {
  if (!wasm) return;
  pause();
  restartDialog.returnValue = "";
  restartDialog.showModal();
});
restartDialog.addEventListener("close", () => {
  if (restartDialog.returnValue === "restart") {
    clearInput();
    wasm.bb_reset();
    lastMessage = -1;
    lastNearby = -1;
    dirty = true;
    view.focus({ preventScroll: true });
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("blur", clearInput);
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(animation);
  clearInput();
  if (audioContext) audioContext.close().catch(() => {});
});

async function load() {
  syncSoundButton();
  try {
    const response = await fetch(new URL("blockbound.wasm.base64", import.meta.url));
    if (!response.ok) throw new Error("Game module unavailable");
    const encoded = (await response.text()).replace(/\s/g, "");
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const result = await WebAssembly.instantiate(bytes, {});
    wasm = result.instance.exports;
    if (!wasm.memory || !wasm.bb_framebuffer) throw new Error("Game module is incomplete");
    wasm.bb_reset();
    const pixels = new Uint8ClampedArray(wasm.memory.buffer, wasm.bb_framebuffer(), WIDTH * HEIGHT * 4);
    image = new ImageData(pixels, WIDTH, HEIGHT);
    action.disabled = false;
    updateHud();
    wasm.bb_render();
    context.putImageData(image, 0, 0);
    previousTime = performance.now();
    animation = requestAnimationFrame(frame);
  } catch (_) {
    root.dataset.state = "error";
    overlayKicker.textContent = "THE CITY COULD NOT OPEN";
    overlayTitle.textContent = "WebAssembly is unavailable.";
    overlayCopy.textContent = "Try a current browser with WebAssembly enabled, then reload this page.";
    status.textContent = "The game module could not be loaded.";
    action.textContent = "City unavailable";
  }
}

load();
