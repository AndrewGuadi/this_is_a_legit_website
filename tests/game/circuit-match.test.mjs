import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  start,
  pause,
  resume,
  setFocus,
  selectTile,
  swapTiles,
  findMatches,
  legalMoves,
  hasLegalMove,
  shuffle,
} from "../../static/circuit-match/core.mjs";

/** Hand-verified board (no initial matches). Swapping r1c0 <-> r1c1 makes
 *  row 1 read [0,2,2,2]; gravity then drops old row-0 col-2 (1) onto the
 *  1s already in rows 2-3, so a second vertical match must follow. */
const CASCADE_BOARD = [
  [1, 0, 1, 2],
  [2, 0, 2, 2],
  [0, 2, 1, 0],
  [0, 1, 1, 2],
];

function fixture(board, options = {}) {
  const s = createGame({ cols: 4, rows: 4, kinds: 3, moves: 20, ...options });
  s.board = board.map((row) => [...row]);
  s.mode = "playing";
  return s;
}

test("equal seeds produce equal boards; different seeds differ", () => {
  const a = createGame({ seed: 42 });
  const b = createGame({ seed: 42 });
  assert.deepEqual(a.board, b.board);
  const c = createGame({ seed: 43 });
  assert.notDeepEqual(a.board, c.board);
});

test("generated boards start match-free and always have a legal move", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const s = createGame({ seed });
    assert.equal(
      findMatches(s.board).length,
      0,
      `seed ${seed} starts with a match`,
    );
    assert.ok(hasLegalMove(s.board), `seed ${seed} starts dead`);
  }
});

test("match detection finds runs, groups long runs once, ignores pairs", () => {
  const board = [
    [0, 0, 0, 1],
    [1, 2, 2, 2],
    [0, 1, 0, 1],
    [1, 1, 0, 0],
  ];
  const groups = findMatches(board);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((g) => g.cells.length).sort(),
    [3, 3],
  );
  const long = [
    [1, 1, 1, 1],
    [0, 2, 0, 2],
    [2, 0, 2, 0],
    [0, 2, 0, 1],
  ];
  const longGroups = findMatches(long);
  assert.equal(longGroups.length, 1);
  assert.equal(longGroups[0].cells.length, 4);
});

test("illegal swaps are rejected without changing board or moves", () => {
  const s = fixture(CASCADE_BOARD);
  const before = structuredClone(s.board);
  for (const [a, b, why] of [
    [[0, 0], [0, 2], "non-adjacent"],
    [[0, 0], [0, 0], "same tile"],
    [[0, 0], [-1, 0], "out of bounds"],
    [[3, 3], [3, 4], "off the board"],
  ]) {
    assert.equal(swapTiles(s, a, b).ok, false, why);
    assert.deepEqual(s.board, before, why);
    assert.equal(s.movesLeft, 20, why);
  }
  s.mode = "ready";
  assert.equal(swapTiles(s, [1, 0], [1, 1]).ok, false);
  assert.deepEqual(s.board, before);
});

test("non-matching adjacent swap reverts and costs no move", () => {
  const s = fixture(CASCADE_BOARD);
  const before = structuredClone(s.board);
  const result = swapTiles(s, [0, 0], [0, 1]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no-match");
  assert.deepEqual(s.board, before);
  assert.equal(s.movesLeft, 20);
  assert.equal(s.score, 0);
});

test("matching swap consumes one move, clears tiles, refills fully", () => {
  const s = fixture(CASCADE_BOARD);
  const result = swapTiles(s, [1, 0], [1, 1]);
  assert.equal(result.ok, true);
  assert.equal(s.movesLeft, 19);
  assert.equal(s.movesUsed, 1);
  assert.ok(result.points >= 30);
  assert.ok(s.score >= 30);
  for (const row of s.board)
    for (const tile of row) assert.ok(tile >= 0, "no holes left");
});

test("cascade resolves in multiple steps with multiplied points", () => {
  const s = fixture(CASCADE_BOARD);
  const result = swapTiles(s, [1, 0], [1, 1]);
  assert.equal(result.ok, true);
  assert.ok(result.cascades >= 2, `expected cascade, got ${result.cascades}`);
  assert.ok(result.points >= 90, `expected >= 90, got ${result.points}`);
  assert.equal(s.mode, "playing");
});

test("move budget exhaustion ends the run and blocks further swaps", () => {
  const s = fixture(CASCADE_BOARD, { moves: 1, target: 99999 });
  const result = swapTiles(s, [1, 0], [1, 1]);
  assert.equal(result.ok, true);
  assert.equal(s.movesLeft, 0);
  assert.equal(s.mode, "gameover");
  const board = structuredClone(s.board);
  assert.equal(swapTiles(s, [0, 0], [0, 1]).ok, false);
  assert.deepEqual(s.board, board);
});

test("reaching the target completes the run", () => {
  const s = fixture(CASCADE_BOARD, { target: 30 });
  const result = swapTiles(s, [1, 0], [1, 1]);
  assert.equal(result.ok, true);
  assert.ok(s.score >= 30);
  assert.equal(s.mode, "complete");
});

test("a stuck board can be shuffled back to solvable and match-free", () => {
  // Note: createGame() never returns a dead board (that is the guarantee),
  // so use a constructed dead board: (r + 2c) mod 6. Rows step by 2 and
  // columns by 1 mod 6, so no three adjacent cells can ever match and no
  // single adjacent swap can create a match in either direction.
  const dead = Array.from({ length: 8 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => (r + 2 * c) % 6),
  );
  assert.equal(findMatches(dead).length, 0);
  assert.equal(hasLegalMove(dead), false);
  const s = createGame({ seed: 7 });
  s.board = dead;
  assert.equal(shuffle(s), true);
  assert.equal(findMatches(s.board).length, 0);
  assert.ok(hasLegalMove(s.board));
});

test("playing boards never sit without a legal move", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = createGame({ seed });
    start(s);
    let guard = 0;
    while (s.mode === "playing" && guard++ < 500) {
      assert.ok(hasLegalMove(s.board), `seed ${seed} stuck mid-game`);
      const moves = legalMoves(s.board);
      swapTiles(s, moves[0].a, moves[0].b);
    }
    assert.ok(["complete", "gameover"].includes(s.mode));
  }
});

test("keyboard flow: focus, select, swap, deselect, retarget", () => {
  const s = fixture(CASCADE_BOARD);
  setFocus(s, 1, 0);
  assert.deepEqual(selectTile(s, 1, 0), { ok: true, action: "select" });
  assert.deepEqual(s.selected, { r: 1, c: 0 });
  const swapped = selectTile(s, 1, 1);
  assert.equal(swapped.action, "swap");
  assert.equal(swapped.ok, true);
  assert.equal(s.selected, null);
  selectTile(s, 0, 0);
  const retarget = selectTile(s, 3, 3);
  assert.equal(retarget.action, "select");
  assert.deepEqual(s.selected, { r: 3, c: 3 });
  const deselect = selectTile(s, 3, 3);
  assert.equal(deselect.action, "deselect");
  assert.equal(s.selected, null);
});

test("pause blocks swaps and resume restores play", () => {
  const s = fixture(CASCADE_BOARD);
  pause(s);
  assert.equal(s.mode, "paused");
  assert.equal(swapTiles(s, [1, 0], [1, 1]).ok, false);
  resume(s);
  assert.equal(s.mode, "playing");
  assert.equal(swapTiles(s, [1, 0], [1, 1]).ok, true);
});
