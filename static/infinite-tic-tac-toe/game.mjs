import {
  createGame,
  start,
  setAction,
  play,
  nextRound,
  resetGame,
} from "./core.mjs";

const $ = (id) => document.getElementById(id);
const root = $("ttt-game");
const board = $("board");
const cells = [...board.querySelectorAll("[data-cell]")];
const dialog = $("reset-dialog");
const other = (player) => (player === "X" ? "O" : "X");
const STORAGE = "legit-infinite-ttt-sound-v1";
let game = createGame();
let transientStatus = "";
let lastMoveKey = "";

class Sound {
  constructor() {
    this.context = null;
    this.failed = false;
    this.muted = true;
    try {
      this.muted = localStorage.getItem(STORAGE) !== "on";
    } catch {
      $("storage-note").textContent = "Browser storage is unavailable. Sound preference and match state last only for this visit; moves are never sent.";
    }
  }
  save() {
    try {
      localStorage.setItem(STORAGE, this.muted ? "off" : "on");
    } catch {
      $("storage-note").textContent = "Browser storage is unavailable. Sound preference and match state last only for this visit; moves are never sent.";
    }
  }
  async unlock() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Audio unavailable");
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") await this.context.resume();
  }
  async toggle() {
    if (this.muted) {
      try {
        await this.unlock();
        this.muted = false;
        this.failed = false;
        this.save();
        await this.play("toggle");
      } catch {
        this.failed = true;
        this.muted = true;
      }
    } else {
      this.muted = true;
      this.save();
    }
  }
  async play(kind) {
    if (this.muted || this.failed) return;
    try {
      await this.unlock();
      const frequencies = { place: 360, remove: 210, win: 620, draw: 280, loop: 160, toggle: 480, "next-round": 440, started: 400 };
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      const now = this.context.currentTime;
      oscillator.type = kind === "remove" || kind === "loop" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequencies[kind] || 360, now);
      if (kind === "win") oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch {
      this.failed = true;
      this.muted = true;
    }
  }
}

const sound = new Sound();

function cellLabel(index) {
  const position = `Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}`;
  const mark = game.board[index];
  const contents = mark ? `${mark} mark` : "empty";
  if (game.mode !== "playing") return `${position}: ${contents}.`;
  if (game.action === "place") {
    return mark
      ? `${position}: ${contents}. Occupied; placing is unavailable.`
      : `${position}: empty. Place ${game.current}.`;
  }
  if (!mark) return `${position}: empty. Choose an opposing mark to remove.`;
  if (mark === game.current) return `${position}: ${contents}. Your own mark; removing is unavailable.`;
  return `${position}: ${contents}. Remove ${mark}.`;
}

function legalCell(index) {
  if (game.mode !== "playing") return false;
  const mark = game.board[index];
  return game.action === "place" ? mark === null : mark !== null && mark !== game.current;
}

function defaultStatus() {
  if (transientStatus) return transientStatus;
  if (game.mode === "ready") return "Press Start match to begin. X starts.";
  if (game.mode === "round-over") {
    return game.winner
      ? `${game.winner} made three in a row and earns one point. Start the next round when both players are ready.`
      : `Round ${game.round} is a draw. No points awarded; the endless match continues.`;
  }
  if (game.lastEvent === "loop") {
    return `Loop broken: both players repeated their exact move three times. Board cleared; scores kept. ${game.current}'s turn.`;
  }
  if (game.lastEvent === "next-round") return `Round ${game.round}. ${game.current} starts this round.`;
  return `${game.current} to ${game.action === "place" ? "place a mark" : `remove ${other(game.current)}'s mark`}.`;
}

function sync() {
  root.dataset.state = game.mode;
  root.dataset.action = game.action;
  $("round-number").textContent = game.round;
  $("score-x").textContent = game.scores.X;
  $("score-o").textContent = game.scores.O;
  $("loop-count").textContent = game.loops;
  $("score-x-panel").classList.toggle("is-current", game.mode === "playing" && game.current === "X");
  $("score-o-panel").classList.toggle("is-current", game.mode === "playing" && game.current === "O");

  const turnLabel = game.mode === "ready"
    ? "Match not started"
    : game.mode === "round-over"
      ? game.winner ? `${game.winner} wins round ${game.round}` : `Round ${game.round} drawn`
      : `${game.current}'s turn`;
  $("turn-label").textContent = turnLabel;
  $("turn-token").textContent = game.current;
  $("turn-token").classList.toggle("mark-x", game.current === "X");
  $("turn-token").classList.toggle("mark-o", game.current === "O");

  for (const action of ["place", "remove"]) {
    const button = $(`${action}-action`);
    button.disabled = game.mode !== "playing";
    button.setAttribute("aria-pressed", String(game.action === action));
  }
  $("place-action").innerHTML = `<span aria-hidden="true">＋</span> Place ${game.current}`;
  $("remove-action").innerHTML = `<span aria-hidden="true">−</span> Remove ${other(game.current)}`;
  $("action-hint").textContent = game.mode !== "playing"
    ? game.mode === "ready" ? "Start the match, then choose an action and a cell." : "Round complete. Review the line, then start the next round."
    : game.action === "place" ? `Choose an empty cell to place ${game.current}.` : `Choose one ${other(game.current)} mark to remove. You cannot remove your own.`;

  cells.forEach((cell, index) => {
    const mark = game.board[index];
    cell.querySelector("span").textContent = mark || "";
    cell.classList.toggle("is-x", mark === "X");
    cell.classList.toggle("is-o", mark === "O");
    cell.classList.toggle("is-winning", game.winningLine.includes(index));
    cell.classList.toggle("is-last", game.lastMove?.index === index);
    cell.setAttribute("aria-label", cellLabel(index));
    cell.setAttribute("aria-disabled", String(!legalCell(index)));
    const moveKey = game.lastMove ? `${game.moves}:${game.lastMove.index}:${mark}` : "";
    cell.classList.toggle("is-entered", Boolean(mark) && moveKey === lastMoveKey);
  });
  lastMoveKey = game.lastMove ? `${game.moves}:${game.lastMove.index}:${game.board[game.lastMove.index]}` : "";

  for (const player of ["X", "O"]) {
    const count = Math.min(3, game.history[player].count);
    const meter = $(`repeat-${player.toLowerCase()}`);
    meter.setAttribute("aria-label", `${player} repeat count: ${count} of 3`);
    meter.setAttribute("aria-valuenow", String(count));
    [...meter.children].forEach((dot, index) => dot.classList.toggle("is-filled", index < count));
  }

  $("start-panel").hidden = game.mode !== "ready";
  $("round-result").hidden = game.mode !== "round-over";
  if (game.mode === "round-over") {
    $("result-kicker").textContent = game.winner ? `${game.winner} COMPLETES A LINE` : "NO LINE THIS TIME";
    $("result-title").textContent = game.winner ? `${game.winner} takes the round.` : "A draw. Still going.";
    $("result-copy").textContent = game.winner
      ? `One point for ${game.winner}. Scores carry forward and ${other(game.starter)} starts the next round.`
      : `No points awarded. ${other(game.starter)} starts the next round.`;
    $("next-round").textContent = `Start round ${game.round + 1}`;
  }
  $("game-status").textContent = defaultStatus();
  $("sound").textContent = sound.muted ? "Sound off" : "Sound on";
  $("sound").setAttribute("aria-pressed", String(!sound.muted));
  $("audio-note").textContent = sound.failed
    ? "Audio is unavailable; the game remains fully playable silently."
    : "Audio begins only after your input.";
}

function invalidMessage(result) {
  const messages = {
    "not-playing": game.mode === "ready" ? "Start the match before choosing a cell." : "This round is complete. Start the next round to continue.",
    "invalid-cell": "Choose one of the nine board cells.",
    occupied: "That cell is occupied. Choose an empty cell or switch to Remove.",
    empty: "That cell is empty. Choose an opposing mark to remove.",
    "own-mark": "You cannot remove your own mark. Choose an opposing mark.",
  };
  return messages[result] || "";
}

async function boardAction(index) {
  transientStatus = "";
  const result = play(game, index);
  transientStatus = invalidMessage(result);
  sync();
  await sound.play(result);
  sync();
  if (result === "win" || result === "draw") $("next-round").focus({ preventScroll: true });
}

cells.forEach((cell, index) => {
  cell.addEventListener("click", () => boardAction(index));
});
board.addEventListener("keydown", (event) => {
  const index = cells.indexOf(event.target);
  if (index < 0 || event.ctrlKey || event.metaKey || event.altKey) return;
  const moves = {
    ArrowLeft: index % 3 === 0 ? index + 2 : index - 1,
    ArrowRight: index % 3 === 2 ? index - 2 : index + 1,
    ArrowUp: (index + 6) % 9,
    ArrowDown: (index + 3) % 9,
    Home: 0,
    End: 8,
  };
  if (!(event.key in moves)) return;
  event.preventDefault();
  cells[moves[event.key]].focus();
});

$("start-match").addEventListener("click", async () => {
  transientStatus = "";
  start(game);
  sync();
  cells[0].focus({ preventScroll: true });
  await sound.play("started");
  sync();
});
$("next-round").addEventListener("click", async () => {
  transientStatus = "";
  nextRound(game);
  sync();
  cells[0].focus({ preventScroll: true });
  await sound.play("next-round");
  sync();
});
for (const action of ["place", "remove"]) {
  $(`${action}-action`).addEventListener("click", () => {
    if (game.mode !== "playing") return;
    transientStatus = "";
    setAction(game, action);
    sync();
  });
}
$("reset-match").addEventListener("click", () => {
  dialog.returnValue = "";
  dialog.showModal();
});
dialog.addEventListener("cancel", () => { dialog.returnValue = "cancel"; });
dialog.addEventListener("close", () => {
  if (dialog.returnValue === "reset") {
    resetGame(game);
    transientStatus = "";
    lastMoveKey = "";
    sync();
    $("start-match").focus({ preventScroll: true });
  } else {
    $("reset-match").focus({ preventScroll: true });
  }
});
$("sound").addEventListener("click", async () => {
  $("sound").disabled = true;
  await sound.toggle();
  $("sound").disabled = false;
  sync();
});

sync();
