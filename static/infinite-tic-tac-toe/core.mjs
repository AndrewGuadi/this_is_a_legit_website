export const LINES = Object.freeze([
  Object.freeze([0, 1, 2]),
  Object.freeze([3, 4, 5]),
  Object.freeze([6, 7, 8]),
  Object.freeze([0, 3, 6]),
  Object.freeze([1, 4, 7]),
  Object.freeze([2, 5, 8]),
  Object.freeze([0, 4, 8]),
  Object.freeze([2, 4, 6]),
]);

const other = (player) => (player === "X" ? "O" : "X");
const emptyHistory = () => ({ signature: null, count: 0 });

export function createGame() {
  return {
    mode: "ready",
    board: Array(9).fill(null),
    current: "X",
    starter: "X",
    action: "place",
    scores: { X: 0, O: 0 },
    round: 1,
    loops: 0,
    moves: 0,
    winner: null,
    winningLine: [],
    lastMove: null,
    lastEvent: "ready",
    history: { X: emptyHistory(), O: emptyHistory() },
  };
}

export function start(game) {
  if (game.mode !== "ready") return "already-started";
  game.mode = "playing";
  game.lastEvent = "started";
  return "started";
}

export function setAction(game, action) {
  if (action !== "place" && action !== "remove") return "invalid-action";
  game.action = action;
  return action;
}

function clearRound(game) {
  game.board.fill(null);
  game.action = "place";
  game.winner = null;
  game.winningLine = [];
  game.lastMove = null;
  game.history = { X: emptyHistory(), O: emptyHistory() };
}

function recordMove(game, signature) {
  const history = game.history[game.current];
  if (history.signature === signature) history.count += 1;
  else {
    history.signature = signature;
    history.count = 1;
  }
}

function winningLine(game) {
  return LINES.find((line) => line.every((index) => game.board[index] === game.current));
}

export function play(game, index) {
  if (game.mode !== "playing") return "not-playing";
  if (!Number.isInteger(index) || index < 0 || index > 8) return "invalid-cell";
  const occupant = game.board[index];
  if (game.action === "place" && occupant !== null) return "occupied";
  if (game.action === "remove" && occupant === null) return "empty";
  if (game.action === "remove" && occupant === game.current) return "own-mark";

  const player = game.current;
  const action = game.action;
  game.board[index] = action === "place" ? player : null;
  game.moves += 1;
  game.lastMove = { player, action, index };
  recordMove(game, `${action}:${index}`);

  const line = winningLine(game);
  if (line) {
    game.mode = "round-over";
    game.winner = player;
    game.winningLine = [...line];
    game.scores[player] += 1;
    game.lastEvent = "win";
    return "win";
  }
  if (game.board.every(Boolean)) {
    game.mode = "round-over";
    game.lastEvent = "draw";
    return "draw";
  }
  if (game.history.X.count >= 3 && game.history.O.count >= 3) {
    clearRound(game);
    game.current = other(player);
    game.loops += 1;
    game.lastEvent = "loop";
    return "loop";
  }

  game.current = other(player);
  game.lastEvent = action;
  return action;
}

export function nextRound(game) {
  if (game.mode !== "round-over") return "round-active";
  clearRound(game);
  game.round += 1;
  game.starter = other(game.starter);
  game.current = game.starter;
  game.mode = "playing";
  game.lastEvent = "next-round";
  return "next-round";
}

export function resetGame(game) {
  Object.assign(game, createGame());
  return "reset";
}
