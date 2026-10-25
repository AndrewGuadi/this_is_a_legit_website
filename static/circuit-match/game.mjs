import {
  createGame,
  start,
  pause,
  resume,
  setFocus,
  selectTile,
  WORLD,
} from "./core.mjs";
import { Renderer, Sound, BOARD } from "./view.mjs";

const root = document.querySelector("#circuit-game"),
  field = document.querySelector("#playfield"),
  canvas = field.querySelector("canvas");
const action = document.querySelector("#game-action"),
  restart = document.querySelector("#restart"),
  soundButton = document.querySelector("#sound");
const dialog = document.querySelector("#restart-dialog");
const renderer = new Renderer(canvas),
  sound = new Sound();
let game = createGame(),
  best = 0,
  persist = false,
  pauseReason = "";
const $ = (id) => document.getElementById(id);
const STORAGE = "legit-circuit-best-v1";
try {
  const stored = localStorage.getItem(STORAGE);
  if (stored !== null && /^\d{1,9}$/.test(stored)) {
    best = Number(stored);
    persist = true;
    $("save-best").checked = true;
  }
} catch {}
function saveBest() {
  if (game.score <= best) return;
  best = game.score;
  if (persist)
    try {
      localStorage.setItem(STORAGE, String(best));
    } catch {
      persist = false;
      $("save-best").checked = false;
      $("storage-note").textContent =
        "Storage unavailable. Your best score lasts only for this visit.";
    }
}
$("save-best").addEventListener("change", (event) => {
  persist = event.target.checked;
  try {
    if (persist) localStorage.setItem(STORAGE, String(best));
    else localStorage.removeItem(STORAGE);
    $("storage-note").textContent = persist
      ? "Only your best score is stored in this browser. Nothing is sent to a server. Uncheck to remove it."
      : "Best score is kept only for this visit. Saved score removed.";
  } catch {
    persist = false;
    event.target.checked = false;
    $("storage-note").textContent =
      "Storage unavailable. Your best score lasts only for this visit.";
  }
  sync();
});
let lastPresentation = "";
function sync() {
  const presentation = JSON.stringify([
    game.mode,
    game.score,
    game.movesLeft,
    game.target,
    best,
    persist,
    sound.muted,
    sound.failed,
    pauseReason,
    game.selected,
    game.focus,
    game.shuffles,
  ]);
  if (presentation === lastPresentation) return;
  lastPresentation = presentation;
  root.dataset.state = game.mode;
  $("score").textContent = String(game.score).padStart(5, "0");
  $("moves").textContent = game.movesLeft;
  $("target").textContent = game.target;
  $("best-display").textContent =
    `${persist ? "Device best" : "Best this visit"}: ${best}`;
  const states = {
    ready: [
      "Ready to wire it up?",
      "Swap tiles to line up three or more matching circuits. Reach the target before your moves run out.",
      "Start run",
      "Arrows move focus. Enter selects and swaps. Tap two adjacent tiles on touch.",
    ],
    playing: [
      "",
      "",
      "Pause",
      game.selected
        ? "Tile selected. Pick an adjacent tile to swap, or the same tile to cancel."
        : "Focus a tile with arrows, then Enter to select it.",
    ],
    paused: [
      "Take a breath.",
      pauseReason || "Your board is safe. Resume when you're ready.",
      "Resume",
      "Paused. Your progress is preserved. Resume explicitly to continue.",
    ],
    complete: [
      "Circuit complete.",
      `${game.score.toLocaleString()} points in ${game.movesUsed} moves. The board is yours.`,
      "Play again",
      "Target reached! Start a fresh board.",
    ],
    gameover: [
      "Out of moves.",
      `${game.score.toLocaleString()} points, target was ${game.target}. Shuffle the next board and try again.`,
      "Play again",
      "Moves exhausted. Start a fresh board.",
    ],
  };
  const [title, copy, label, status] = states[game.mode];
  $("game-overlay").hidden = game.mode === "playing";
  $("overlay-title").textContent = title;
  $("overlay-copy").textContent = copy;
  $("overlay-kicker").textContent =
    game.mode === "complete"
      ? "CIRCUIT COMPLETE"
      : `TARGET ${game.target} / ${game.movesTotal} MOVES`;
  action.textContent = label;
  action.disabled = false;
  if ($("game-status").textContent !== status)
    $("game-status").textContent = status;
  soundButton.textContent = sound.muted ? "Sound off" : "Sound on";
  soundButton.setAttribute("aria-pressed", String(!sound.muted));
  if (sound.failed)
    $("audio-note").textContent =
      "Audio unavailable. You can keep playing silently.";
}
function stop(reason = "") {
  pauseReason = reason;
  pause(game);
  sync();
  renderer.draw(game);
}
function fresh() {
  game = createGame();
  pauseReason = "";
  renderer.draw(game);
  sync();
}
function act() {
  if (dialog.open) return;
  switch (game.mode) {
    case "ready":
      start(game);
      sound.play("select");
      break;
    case "playing":
      stop();
      break;
    case "paused":
      resume(game);
      break;
    default:
      fresh();
  }
  sync();
  field.focus({ preventScroll: true });
  renderer.draw(game);
}
function requestRestart() {
  if (dialog.open) return;
  if (game.movesUsed > 0 && !["complete", "gameover"].includes(game.mode)) {
    stop("Restart canceled? Your board stays paused until you resume.");
    dialog.showModal();
  } else {
    fresh();
    field.focus({ preventScroll: true });
  }
}
action.addEventListener("click", act);
restart.addEventListener("click", requestRestart);
dialog.addEventListener("close", () => {
  if (dialog.returnValue === "restart") fresh();
  sync();
  field.focus({ preventScroll: true });
});
dialog.addEventListener("cancel", () => {
  dialog.returnValue = "cancel";
});
soundButton.addEventListener("click", async () => {
  soundButton.disabled = true;
  await sound.toggle();
  soundButton.disabled = false;
  sync();
});
field.addEventListener("keydown", (event) => {
  if (
    event.target !== field ||
    dialog.open ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return;
  const key = event.key.toLowerCase();
  if (
    !["arrowleft", "arrowright", "arrowup", "arrowdown", "enter", "p", "escape"].includes(key)
  )
    return;
  event.preventDefault();
  if (event.repeat) return;
  const { r, c } = game.focus;
  if (key === "arrowleft") setFocus(game, r, c - 1);
  else if (key === "arrowright") setFocus(game, r, c + 1);
  else if (key === "arrowup") setFocus(game, r - 1, c);
  else if (key === "arrowdown") setFocus(game, r + 1, c);
  else if (key === "enter" && game.mode === "playing") {
    const result = selectTile(game, r, c);
    if (result.action === "swap")
      sound.play(result.ok ? "match" : "nomatch");
    else if (result.action === "select") sound.play("select");
    if (result.shuffled) sound.play("shuffle");
    if (game.mode === "complete") sound.play("win");
    if (game.mode === "gameover") sound.play("lose");
    saveBest();
  } else if (
    (key === "p" || key === "escape") &&
    ["ready", "playing", "paused"].includes(game.mode)
  ) {
    if (game.mode === "paused") resume(game);
    else stop();
  }
  sync();
  renderer.draw(game);
});
field.addEventListener("blur", () => {
  if (game.mode === "playing") stop("Field lost focus. Resume when you're ready.");
});
function cellFromEvent(event) {
  const b = canvas.getBoundingClientRect();
  const x = ((event.clientX - b.left) / b.width) * WORLD.width;
  const y = ((event.clientY - b.top) / b.height) * WORLD.height;
  const c = Math.floor((x - BOARD.originX) / BOARD.cell);
  const r = Math.floor((y - BOARD.originY) / BOARD.cell);
  if (r < 0 || r >= game.rows || c < 0 || c >= game.cols) return null;
  return { r, c };
}
field.addEventListener("pointerdown", (event) => {
  if (dialog.open || game.mode !== "playing" || event.button !== 0) return;
  event.preventDefault();
  field.focus({ preventScroll: true });
  const cell = cellFromEvent(event);
  if (!cell) return;
  const result = selectTile(game, cell.r, cell.c);
  if (result.action === "swap")
    sound.play(result.ok ? "match" : "nomatch");
  else if (result.action === "select") sound.play("select");
  if (result.shuffled) sound.play("shuffle");
  if (game.mode === "complete") sound.play("win");
  if (game.mode === "gameover") sound.play("lose");
  saveBest();
  sync();
  renderer.draw(game);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.mode === "playing")
    stop("Tab hidden. Resume when you're ready.");
});
window.addEventListener("blur", () => {
  if (game.mode === "playing") stop("Window unfocused. Resume when you're ready.");
});
function resize() {
  const cabinet = document.querySelector(".game-cabinet");
  const overhead =
    cabinet.getBoundingClientRect().height -
    field.getBoundingClientRect().height;
  field.style.maxWidth = `${Math.max(100, innerHeight - overhead - 28) * 0.9}px`;
  renderer.resize();
  renderer.draw(game);
}
window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(field);
function frame() {
  // Turn-based game: redraw every frame only while a match flash is fading.
  if (
    game.lastSwap &&
    Date.now() - game.lastSwapAt < 400 &&
    !renderer.reduced.matches
  )
    renderer.draw(game);
  requestAnimationFrame(frame);
}
if (!renderer.ctx) {
  $("game-status").textContent =
    "Canvas is unavailable in this browser. Please try a browser with Canvas support.";
  action.textContent = "Canvas unavailable";
} else {
  resize();
  sync();
  renderer.draw(game);
  requestAnimationFrame(frame);
}
