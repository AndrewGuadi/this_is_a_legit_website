/** Circuit Match: deterministic match-puzzle simulation. No DOM, storage,
 *  audio or unseeded random input. The board is plain data; the RNG state
 *  lives on the game object so equal seeds produce equal boards.
 *
 *  Draft for the catalog entry "Circuit Match" (Match puzzle): swap circuit
 *  tiles, build matching lines, and solve compact boards within a move
 *  budget. Original code; no branded assets, accounts or services.
 */
export const WORLD = Object.freeze({ width: 720, height: 800 });

/** Six circuit components. Color is never the only cue: every kind also has
 *  a distinct glyph drawn by view.mjs. The first four colors echo the
 *  repo's original circuit-match arcade art palette. */
export const KINDS = Object.freeze([
  { name: "node", color: "#d1f875", glyph: "dot" },
  { name: "resistor", color: "#ff8d76", glyph: "zigzag" },
  { name: "capacitor", color: "#8bdae3", glyph: "bars" },
  { name: "coil", color: "#b9acf4", glyph: "wave" },
  { name: "diode", color: "#ffd166", glyph: "diode" },
  { name: "chip", color: "#7ce8b5", glyph: "chip" },
]);

export const DEFAULTS = Object.freeze({
  cols: 8,
  rows: 8,
  kinds: 6,
  moves: 20,
  target: 1500,
});

/** One mulberry32 step. Keeps the RNG reproducible from a single integer. */
function nextRand(s) {
  s.rngState = (s.rngState + 0x6d2b79f5) >>> 0;
  let t = s.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randInt(s, n) {
  return Math.floor(nextRand(s) * n);
}

const key = (r, c) => `${r},${c}`;
const inBounds = (s, r, c) => r >= 0 && r < s.rows && c >= 0 && c < s.cols;

/** All runs of 3+ equal kinds, as groups of cells. */
export function findMatches(board) {
  const rows = board.length;
  const cols = rows ? board[0].length : 0;
  const groups = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; ) {
      const kind = board[r][c];
      let end = c + 1;
      while (end < cols && board[r][end] === kind) end++;
      if (kind >= 0 && end - c >= 3) {
        const cells = [];
        for (let i = c; i < end; i++) cells.push([r, i]);
        groups.push({ kind, cells });
      }
      c = end;
    }
  }
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; ) {
      const kind = board[r][c];
      let end = r + 1;
      while (end < rows && board[end][c] === kind) end++;
      if (kind >= 0 && end - r >= 3) {
        const cells = [];
        for (let i = r; i < end; i++) cells.push([i, c]);
        groups.push({ kind, cells });
      }
      r = end;
    }
  }
  return groups;
}

function matchesAt(board, r, c) {
  return findMatches(board).some((g) =>
    g.cells.some(([gr, gc]) => gr === r && gc === c),
  );
}

/** Every adjacent swap that would create at least one match. */
export function legalMoves(board) {
  const rows = board.length;
  const cols = rows ? board[0].length : 0;
  const moves = [];
  const trySwap = (r1, c1, r2, c2) => {
    const a = board[r1][c1];
    const b = board[r2][c2];
    if (a === b) return;
    board[r1][c1] = b;
    board[r2][c2] = a;
    if (matchesAt(board, r1, c1) || matchesAt(board, r2, c2))
      moves.push({ a: [r1, c1], b: [r2, c2] });
    board[r1][c1] = a;
    board[r2][c2] = b;
  };
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) trySwap(r, c, r, c + 1);
      if (r + 1 < rows) trySwap(r, c, r + 1, c);
    }
  return moves;
}

export function hasLegalMove(board) {
  return legalMoves(board).length > 0;
}

/** Random permutation of the tiles, laid back row-major. */
function shuffleTiles(s) {
  const flat = s.board.flat();
  for (let i = flat.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [flat[i], flat[j]] = [flat[j], flat[i]];
  }
  for (let r = 0; r < s.rows; r++)
    for (let c = 0; c < s.cols; c++) s.board[r][c] = flat[r * s.cols + c];
}

/** Fill without immediate matches, then guarantee at least one legal move.
 *  A board that starts dead is reshuffled; if shuffling cannot fix it, the
 *  generator reseeds and starts over. No dead-end boards leave this function. */
function generateBoard(s) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const board = [];
    for (let r = 0; r < s.rows; r++) {
      board[r] = [];
      for (let c = 0; c < s.cols; c++) {
        const banned = new Set();
        if (c >= 2 && board[r][c - 1] === board[r][c - 2])
          banned.add(board[r][c - 1]);
        if (r >= 2 && board[r - 1][c] === board[r - 2][c])
          banned.add(board[r - 1][c]);
        const choices = [];
        for (let k = 0; k < s.kinds; k++) if (!banned.has(k)) choices.push(k);
        board[r][c] = choices[randInt(s, choices.length)];
      }
    }
    s.board = board;
    if (hasLegalMove(board)) return;
    for (let i = 0; i < 200; i++) {
      shuffleTiles(s);
      if (
        findMatches(s.board).length === 0 &&
        hasLegalMove(s.board)
      )
        return;
    }
    s.rngState = (s.rngState + 1) >>> 0;
  }
  throw new Error("could not generate a solvable board");
}

export function createGame(options = {}) {
  const s = {
    mode: "ready",
    priorMode: null,
    seed: (options.seed ?? Date.now()) >>> 0,
    rngState: 0,
    cols: options.cols ?? DEFAULTS.cols,
    rows: options.rows ?? DEFAULTS.rows,
    kinds: options.kinds ?? DEFAULTS.kinds,
    movesTotal: options.moves ?? DEFAULTS.moves,
    movesLeft: options.moves ?? DEFAULTS.moves,
    movesUsed: 0,
    target: options.target ?? DEFAULTS.target,
    score: 0,
    cleared: 0,
    shuffles: 0,
    board: [],
    focus: { r: 0, c: 0 },
    selected: null,
    lastSwap: null,
    lastSwapAt: 0,
  };
  s.rngState = s.seed;
  generateBoard(s);
  s.focus = { r: Math.floor(s.rows / 2), c: Math.floor(s.cols / 2) };
  return s;
}

export function start(s) {
  if (s.mode === "ready") s.mode = "playing";
}

export function pause(s) {
  if (s.mode === "playing" || s.mode === "ready") {
    s.priorMode = s.mode;
    s.mode = "paused";
  }
}

export function resume(s) {
  if (s.mode === "paused") {
    s.mode = s.priorMode === "playing" ? "playing" : "ready";
    s.priorMode = null;
  }
}

export function setFocus(s, r, c) {
  if (!inBounds(s, r, c)) return;
  s.focus = { r, c };
}

/** Drop tiles down each column and refill the top from the seeded RNG. */
function collapse(s) {
  for (let c = 0; c < s.cols; c++) {
    let write = s.rows - 1;
    for (let r = s.rows - 1; r >= 0; r--) {
      if (s.board[r][c] >= 0) {
        s.board[write][c] = s.board[r][c];
        write--;
      }
    }
    for (let r = write; r >= 0; r--) s.board[r][c] = randInt(s, s.kinds);
  }
}

/** Clear matches until the board settles. Returns cascade detail.
 *  Step n pays n x 10 points per tile, so chains beat single matches. */
function resolve(s) {
  let points = 0;
  let steps = 0;
  let cleared = 0;
  const matchedCells = [];
  for (let guard = 0; guard < 100; guard++) {
    const groups = findMatches(s.board);
    if (!groups.length) break;
    steps++;
    const cells = new Set();
    for (const g of groups)
      for (const [r, c] of g.cells) cells.add(key(r, c));
    for (const k of cells) {
      const [r, c] = k.split(",").map(Number);
      s.board[r][c] = -1;
      matchedCells.push([r, c]);
    }
    const n = cells.size;
    points += n * 10 * steps;
    cleared += n;
    collapse(s);
  }
  s.score += points;
  s.cleared += cleared;
  return { points, steps, cleared, matchedCells };
}

/** Shuffle a stuck mid-game board (free: costs no move). */
export function shuffle(s) {
  for (let i = 0; i < 200; i++) {
    shuffleTiles(s);
    if (findMatches(s.board).length === 0 && hasLegalMove(s.board)) {
      s.shuffles++;
      return true;
    }
  }
  return false;
}

export function swapTiles(s, a, b) {
  const fail = (reason) => ({ ok: false, reason });
  if (s.mode !== "playing") return fail("not-playing");
  const [r1, c1] = a;
  const [r2, c2] = b;
  if (!inBounds(s, r1, c1) || !inBounds(s, r2, c2)) return fail("out-of-bounds");
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1)
    return fail("not-adjacent");
  const kindA = s.board[r1][c1];
  const kindB = s.board[r2][c2];
  s.board[r1][c1] = kindB;
  s.board[r2][c2] = kindA;
  if (!matchesAt(s.board, r1, c1) && !matchesAt(s.board, r2, c2)) {
    s.board[r1][c1] = kindA;
    s.board[r2][c2] = kindB;
    return fail("no-match");
  }
  s.movesLeft--;
  s.movesUsed++;
  const cascade = resolve(s);
  let shuffled = false;
  if (s.score >= s.target) {
    s.mode = "complete";
  } else if (s.movesLeft <= 0) {
    s.mode = "gameover";
  } else if (!hasLegalMove(s.board)) {
    shuffled = shuffle(s);
    if (!shuffled) s.mode = "gameover";
  }
  s.lastSwap = { a, b, matched: cascade.matchedCells, points: cascade.points };
  s.lastSwapAt = Date.now();
  return {
    ok: true,
    points: cascade.points,
    cascades: cascade.steps,
    cleared: cascade.cleared,
    shuffled,
    movesLeft: s.movesLeft,
    score: s.score,
    mode: s.mode,
  };
}

/** Keyboard flow from the catalog: arrows focus, Enter selects/swaps.
 *  First Enter selects a tile; Enter on an adjacent tile swaps; Enter on
 *  the same tile deselects; Enter elsewhere moves the selection. */
export function selectTile(s, r, c) {
  if (s.mode !== "playing") return { ok: false, reason: "not-playing" };
  if (!inBounds(s, r, c)) return { ok: false, reason: "out-of-bounds" };
  s.focus = { r, c };
  if (!s.selected) {
    s.selected = { r, c };
    return { ok: true, action: "select" };
  }
  const { r: sr, c: sc } = s.selected;
  if (sr === r && sc === c) {
    s.selected = null;
    return { ok: true, action: "deselect" };
  }
  if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
    const result = swapTiles(s, [sr, sc], [r, c]);
    s.selected = null;
    return { ok: result.ok, action: "swap", ...result };
  }
  s.selected = { r, c };
  return { ok: true, action: "select" };
}
