import {
  createGame,
  launch,
  movePaddle,
  pause,
  resume,
  advanceStage,
  step,
  STAGES,
  WORLD,
} from "./core.mjs";
import { Renderer, Sound } from "./view.mjs";
const root = document.querySelector("#neon-game"),
  field = document.querySelector("#playfield"),
  canvas = field.querySelector("canvas");
const action = document.querySelector("#game-action"),
  restart = document.querySelector("#restart"),
  soundButton = document.querySelector("#sound");
const dialog = document.querySelector("#restart-dialog"),
  strip = document.querySelector("#touch-strip");
const renderer = new Renderer(canvas),
  sound = new Sound();
let game = createGame(),
  last = 0,
  accumulator = 0,
  best = 0,
  persist = false,
  pointer = null,
  pauseReason = "";
const held = new Set();
const $ = (id) => document.getElementById(id);
const STORAGE = "legit-neon-best-v1";
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
    game.lives,
    game.stage,
    best,
    persist,
    sound.muted,
    sound.failed,
    pauseReason,
  ]);
  if (presentation === lastPresentation) return;
  lastPresentation = presentation;
  root.dataset.state = game.mode;
  $("score").textContent = String(game.score).padStart(5, "0");
  $("lives").textContent = game.lives;
  $("life-marks").textContent = "● ".repeat(game.lives).trim();
  $("stage-number").textContent = `0${game.stage + 1} / 03`;
  $("stage-name").textContent = STAGES[game.stage].name;
  $("best-display").textContent =
    `${persist ? "Device best" : "Best this visit"}: ${best}`;
  const states = {
    ready: [
      game.elapsed ? "Back in the signal." : "Ready to break\nthe silence?",
      game.elapsed
        ? `${game.lives} ${game.lives === 1 ? "life" : "lives"} remaining. Take your time. Aim, then launch.`
        : "Clear the signals. Keep the ball alive.",
      "Launch ball",
      "Aim with arrows, mouse or touch. Launch when you’re ready.",
    ],
    playing: [
      "",
      "",
      "Pause",
      "Find the angle. Paddle edges send sharper returns.",
    ],
    paused: [
      "Take a breath.",
      pauseReason || "Your run is safe. Resume when you’re ready.",
      "Resume",
      "Paused. Your progress is preserved. Resume explicitly to continue.",
    ],
    "stage-clear": [
      "Sector clear.",
      `Next: ${STAGES[Math.min(2, game.stage + 1)].name}. Same lives. New angles.`,
      "Next sector",
      "Formation cleared. Continue when you’re ready.",
    ],
    gameover: [
      "Signal lost.",
      `${game.score.toLocaleString()} points. Every return is another chance to learn.`,
      "Play again",
      "Game over. Start a fresh three-life run.",
    ],
    complete: [
      "All signals clear.",
      `${game.score.toLocaleString()} points. Three sectors. Beautifully broken.`,
      "Play again",
      "Run complete! All three sectors cleared.",
    ],
  };
  const [title, copy, label, status] = states[game.mode];
  $("game-overlay").hidden = game.mode === "playing";
  $("overlay-title").textContent = title;
  $("overlay-title").style.whiteSpace = "pre-line";
  $("overlay-copy").textContent = copy;
  $("overlay-kicker").textContent =
    game.mode === "complete"
      ? "TRANSMISSION COMPLETE"
      : `SECTOR 0${game.stage + 1} / ${STAGES[game.stage].name.toUpperCase()}`;
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
  held.clear();
  pointer = null;
  pauseReason = reason;
  pause(game);
  accumulator = 0;
  sync();
  renderer.draw(game, 0);
}
function fresh() {
  game = createGame();
  held.clear();
  pointer = null;
  accumulator = 0;
  pauseReason = "";
  renderer.clear();
  sync();
  renderer.draw(game, 0);
}
function showCabinet() {
  document
    .querySelector(".game-cabinet")
    .scrollIntoView({ block: "center", behavior: "instant" });
}
function act() {
  if (dialog.open) return;
  switch (game.mode) {
    case "ready":
      launch(game);
      sound.play("launch");
      break;
    case "playing":
      stop();
      break;
    case "paused":
      resume(game);
      break;
    case "stage-clear":
      advanceStage(game);
      renderer.clear();
      break;
    default:
      fresh();
  }
  held.clear();
  accumulator = 0;
  sync();
  field.focus({ preventScroll: true });
  showCabinet();
  renderer.draw(game, 0);
}
function requestRestart() {
  if (dialog.open) return;
  if (game.elapsed > 0 && !["complete", "gameover"].includes(game.mode)) {
    stop("Restart canceled? Your run stays paused until you resume.");
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
  if (!["arrowleft", "arrowright", "a", "d", " ", "p", "escape"].includes(key))
    return;
  event.preventDefault();
  if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
    held.add(key);
    return;
  }
  if (event.repeat) return;
  if (key === " " && game.mode === "ready") act();
  else if (
    (key === "p" || key === "escape") &&
    ["ready", "playing", "paused"].includes(game.mode)
  )
    actPause();
});
function actPause() {
  if (game.mode === "paused") {
    resume(game);
    sync();
    showCabinet();
  } else stop();
}
window.addEventListener("keyup", (event) =>
  held.delete(event.key.toLowerCase()),
);
field.addEventListener("blur", () => {
  held.clear();
});
function worldX(event) {
  const b = canvas.getBoundingClientRect();
  return ((event.clientX - b.left) / b.width) * WORLD.width;
}
for (const region of [field, strip]) {
  region.addEventListener("pointerdown", (event) => {
    if (
      dialog.open ||
      !["playing", "ready"].includes(game.mode) ||
      event.button !== 0 ||
      pointer
    )
      return;
    event.preventDefault();
    field.focus({ preventScroll: true });
    pointer = {
      id: event.pointerId,
      start: worldX(event),
      paddle: game.paddle.x,
      relative: event.pointerType !== "mouse" || region === strip,
    };
    region.setPointerCapture(event.pointerId);
    if (!pointer.relative) movePaddle(game, worldX(event));
    renderer.draw(game, 0);
  });
  region.addEventListener("pointermove", (event) => {
    if (dialog.open) return;
    if (pointer && pointer.id === event.pointerId) {
      movePaddle(
        game,
        pointer.relative
          ? pointer.paddle + worldX(event) - pointer.start
          : worldX(event),
      );
      renderer.draw(game, 0);
    } else if (event.pointerType === "mouse" && region === field && !pointer) {
      movePaddle(game, worldX(event));
      renderer.draw(game, 0);
    }
  });
  region.addEventListener("pointerup", (event) => {
    if (pointer?.id === event.pointerId) {
      pointer = null;
      if (region.hasPointerCapture(event.pointerId))
        region.releasePointerCapture(event.pointerId);
    }
  });
  region.addEventListener("pointercancel", () =>
    stop("Touch interrupted. Resume when you’re ready."),
  );
  region.addEventListener("lostpointercapture", () => {
    pointer = null;
  });
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop("Tab hidden. Resume when you’re ready.");
  last = 0;
});
window.addEventListener("blur", () =>
  stop("Window unfocused. Resume when you’re ready."),
);
let width = 0,
  height = 0,
  viewportWidth = 0;
function resize() {
  const cabinet = document.querySelector(".game-cabinet");
  const overhead =
    cabinet.getBoundingClientRect().height -
    field.getBoundingClientRect().height;
  field.style.maxWidth = `${Math.max(100, innerHeight - overhead - 28) * 1.6}px`;
  const b = canvas.getBoundingClientRect();
  if (
    width &&
    (Math.abs(b.width - width) > 0.5 ||
      innerHeight !== height ||
      innerWidth !== viewportWidth)
  )
    stop("Screen changed. Your run is paused.");
  width = b.width;
  height = innerHeight;
  viewportWidth = innerWidth;
  renderer.resize();
  renderer.draw(game, 0);
}
window.addEventListener("resize", resize);
new ResizeObserver(resize).observe(field);
function frame(now) {
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
  last = now;
  if (game.mode === "playing" || game.mode === "ready") {
    const wasPlaying = game.mode === "playing";
    const direction =
      Number(held.has("arrowright") || held.has("d")) -
      Number(held.has("arrowleft") || held.has("a"));
    accumulator += dt;
    let events = [];
    while (accumulator >= 1 / 240) {
      if (direction) movePaddle(game, game.paddle.x + (direction * 690) / 240);
      events.push(...step(game, 1 / 240));
      accumulator -= 1 / 240;
    }
    renderer.events(events);
    for (const event of events) sound.play(event.type);
    saveBest();
    sync();
    if (wasPlaying || direction) renderer.draw(game, dt);
  }
  requestAnimationFrame(frame);
}
if (!renderer.ctx) {
  $("game-status").textContent =
    "Canvas is unavailable in this browser. Please try a browser with Canvas support.";
  action.textContent = "Canvas unavailable";
} else {
  resize();
  sync();
  requestAnimationFrame(frame);
}
