import test from "node:test";
import assert from "node:assert/strict";
import {
  LINES,
  createGame,
  start,
  setAction,
  play,
  nextRound,
  resetGame,
} from "../../static/infinite-tic-tac-toe/core.mjs";

function playing() {
  const game = createGame();
  assert.equal(start(game), "started");
  return game;
}

function moves(game, entries) {
  for (const [action, index] of entries) {
    setAction(game, action);
    play(game, index);
  }
}

test("new match is an empty, scoreless local two-player game waiting to start", () => {
  const game = createGame();
  assert.equal(game.mode, "ready");
  assert.deepEqual(game.board, Array(9).fill(null));
  assert.equal(game.current, "X");
  assert.equal(game.starter, "X");
  assert.equal(game.action, "place");
  assert.deepEqual(game.scores, { X: 0, O: 0 });
  assert.equal(game.round, 1);
  assert.equal(game.loops, 0);
  assert.equal(game.moves, 0);
  assert.equal(game.winner, null);
  assert.deepEqual(game.winningLine, []);
  assert.deepEqual(play(game, 0), "not-playing");
  assert.deepEqual(game.board, Array(9).fill(null));
});

test("start is intentional and cannot duplicate a running match", () => {
  const game = createGame();
  assert.equal(start(game), "started");
  assert.equal(game.mode, "playing");
  assert.equal(start(game), "already-started");
  assert.equal(game.current, "X");
});

test("placing alternates players and occupied or invalid cells never consume a turn", () => {
  const game = playing();
  assert.equal(play(game, 4), "place");
  assert.equal(game.board[4], "X");
  assert.equal(game.current, "O");
  assert.equal(game.moves, 1);
  const snapshot = structuredClone(game);
  assert.equal(play(game, 4), "occupied");
  assert.deepEqual(game, snapshot);
  for (const index of [-1, 9, 1.5, "4", null, undefined]) {
    assert.equal(play(game, index), "invalid-cell");
    assert.deepEqual(game, snapshot);
  }
});

test("remove spends a turn only when taking an opposing mark", () => {
  const game = playing();
  play(game, 0);
  play(game, 1);
  setAction(game, "remove");
  assert.equal(game.current, "X");
  const invalidSnapshot = structuredClone(game);
  assert.equal(play(game, 0), "own-mark");
  assert.deepEqual(game, invalidSnapshot);
  assert.equal(play(game, 2), "empty");
  assert.deepEqual(game, invalidSnapshot);
  assert.equal(play(game, 1), "remove");
  assert.equal(game.board[1], null);
  assert.equal(game.current, "O");
  assert.equal(game.moves, 3);
});

test("switching place/remove modes is free and never changes the board or turn", () => {
  const game = playing();
  const snapshot = structuredClone(game);
  assert.equal(setAction(game, "remove"), "remove");
  assert.equal(setAction(game, "place"), "place");
  assert.equal(setAction(game, "invalid"), "invalid-action");
  assert.equal(game.action, "place");
  const { action: ignored, ...expected } = snapshot;
  const { action: actualAction, ...actual } = game;
  assert.deepEqual(actual, expected);
  assert.equal(actualAction, "place");
});

test("every three-in-a-row scores exactly once and freezes the completed round", () => {
  const setups = [
    [[0, 3, 1, 4, 2], [0, 1, 2]],
    [[3, 0, 4, 1, 5], [3, 4, 5]],
    [[6, 0, 7, 1, 8], [6, 7, 8]],
    [[0, 1, 3, 2, 6], [0, 3, 6]],
    [[1, 0, 4, 2, 7], [1, 4, 7]],
    [[2, 0, 5, 1, 8], [2, 5, 8]],
    [[0, 3, 4, 5, 8], [0, 4, 8]],
    [[2, 0, 4, 1, 6], [2, 4, 6]],
  ];
  assert.equal(LINES.length, 8);
  for (const [sequence, expectedLine] of setups) {
    const game = playing();
    for (let turn = 0; turn < sequence.length; turn += 1) {
      const result = play(game, sequence[turn]);
      assert.equal(result, turn === sequence.length - 1 ? "win" : "place");
    }
    assert.equal(game.mode, "round-over");
    assert.equal(game.winner, "X");
    assert.deepEqual(game.winningLine, expectedLine);
    assert.equal(game.scores.X, 1);
    assert.equal(game.scores.O, 0);
    const snapshot = structuredClone(game);
    assert.equal(play(game, 2), "not-playing");
    assert.deepEqual(game, snapshot);
  }
});

test("a full board without a line is a draw, not a match-ending victory", () => {
  const game = playing();
  const result = moves(game, [
    ["place", 0], ["place", 1], ["place", 2], ["place", 4],
    ["place", 3], ["place", 5], ["place", 7], ["place", 6],
  ]);
  assert.deepEqual(result, undefined);
  assert.equal(play(game, 8), "draw");
  assert.equal(game.mode, "round-over");
  assert.equal(game.winner, null);
  assert.deepEqual(game.winningLine, []);
  assert.deepEqual(game.scores, { X: 0, O: 0 });
});

test("next round preserves scores, alternates the starter, and supports endless rounds", () => {
  const game = playing();
  moves(game, [["place", 0], ["place", 3], ["place", 1], ["place", 4], ["place", 2]]);
  assert.equal(nextRound(game), "next-round");
  assert.equal(game.mode, "playing");
  assert.deepEqual(game.board, Array(9).fill(null));
  assert.deepEqual(game.scores, { X: 1, O: 0 });
  assert.equal(game.round, 2);
  assert.equal(game.starter, "O");
  assert.equal(game.current, "O");
  assert.equal(game.action, "place");
  assert.equal(game.winner, null);
  moves(game, [["place", 0], ["place", 3], ["place", 1], ["place", 4], ["place", 2]]);
  assert.equal(game.winner, "O");
  assert.deepEqual(game.scores, { X: 1, O: 1 });
  nextRound(game);
  assert.equal(game.round, 3);
  assert.equal(game.current, "X");
  assert.equal(game.mode, "playing");
  assert.equal(nextRound(game), "round-active");
});

test("three identical consecutive own turns by both players break the loop and clear only the board", () => {
  const game = playing();
  game.scores.X = 2;
  game.scores.O = 1;
  game.round = 4;
  for (let cycle = 1; cycle <= 3; cycle += 1) {
    setAction(game, "place");
    assert.equal(play(game, 4), "place");
    setAction(game, "remove");
    assert.equal(play(game, 4), cycle === 3 ? "loop" : "remove");
    if (cycle < 3) {
      assert.equal(game.board[4], null);
      assert.equal(game.loops, 0);
    }
  }
  assert.deepEqual(game.board, Array(9).fill(null));
  assert.equal(game.mode, "playing");
  assert.equal(game.current, "X");
  assert.equal(game.loops, 1);
  assert.equal(game.moves, 6);
  assert.deepEqual(game.scores, { X: 2, O: 1 });
  assert.equal(game.round, 4);
  assert.deepEqual(game.winningLine, []);
  assert.equal(game.lastMove, null);
  assert.equal(game.history.X.count, 0);
  assert.equal(game.history.O.count, 0);
});

test("loop detection requires both players to repeat their own exact action three times", () => {
  const onePlayer = playing();
  moves(onePlayer, [
    ["place", 0], ["place", 4],
    ["remove", 0], ["remove", 4],
    ["place", 0], ["place", 4],
    ["remove", 0], ["place", 8],
  ]);
  assert.equal(onePlayer.loops, 0);

  const interrupted = playing();
  moves(interrupted, [
    ["place", 0], ["remove", 0],
    ["place", 0], ["place", 4],
    ["place", 1], ["remove", 1],
    ["place", 1], ["remove", 1],
  ]);
  assert.equal(interrupted.loops, 0);
  assert.equal(interrupted.board.filter(Boolean).length, 2);
});

test("reset match returns every counter and setting to a clean ready state", () => {
  const game = playing();
  moves(game, [["place", 0], ["place", 3], ["place", 1], ["place", 4], ["place", 2]]);
  nextRound(game);
  setAction(game, "remove");
  resetGame(game);
  assert.deepEqual(game, createGame());
});
