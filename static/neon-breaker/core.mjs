/** Deterministic world-space simulation. No DOM, storage, audio or random input. */
export const WORLD = Object.freeze({ width: 960, height: 600 });
export const STAGES = Object.freeze([
  {
    name: "First light",
    subtitle: "Find your rhythm",
    rows: [".111111.", "11111111", ".111111.", "..1111.."],
  },
  {
    name: "Cross current",
    subtitle: "Work the angles",
    rows: ["11....11", ".11..11.", "..1111..", ".11..11.", "11....11"],
  },
  {
    name: "Afterglow",
    subtitle: "Make every return count",
    rows: ["..1111..", ".111111.", "111..111", ".111111.", "..1111.."],
  },
]);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const EPS = 1e-7;
function formation(stage) {
  return STAGES[stage].rows.flatMap((row, j) =>
    [...row].flatMap((cell, i) =>
      cell === "1"
        ? [
            {
              x: 148 + i * 84,
              y: 92 + j * 38,
              w: 76,
              h: 26,
              alive: true,
              tone: j % 3,
            },
          ]
        : [],
    ),
  );
}
function dock(s) {
  s.ball.x = s.paddle.x;
  s.ball.y = s.paddle.y - s.ball.r - 2;
  s.ball.vx = 0;
  s.ball.vy = 0;
}
export function createGame() {
  const s = {
    mode: "ready",
    priorMode: null,
    stage: 0,
    score: 0,
    lives: 3,
    combo: 0,
    elapsed: 0,
    paddle: { x: 480, y: 550, w: 132, h: 14 },
    ball: { x: 480, y: 540, vx: 0, vy: 0, r: 8 },
    bricks: formation(0),
  };
  dock(s);
  return s;
}
export function movePaddle(s, x) {
  if (!Number.isFinite(x) || !["playing", "ready"].includes(s.mode)) return;
  s.paddle.x = clamp(x, s.paddle.w / 2, WORLD.width - s.paddle.w / 2);
  if (s.mode === "ready") dock(s);
}
export function launch(s) {
  if (s.mode !== "ready") return;
  s.mode = "playing";
  s.ball.vx = 110;
  s.ball.vy = -Math.sqrt((380 + s.stage * 35) ** 2 - 110 ** 2);
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
export function advanceStage(s) {
  if (s.mode !== "stage-clear" || s.stage >= 2) return;
  s.stage++;
  s.bricks = formation(s.stage);
  s.mode = "ready";
  s.combo = 0;
  s.paddle.x = 480;
  dock(s);
}
function boundSpeed(b) {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed > 560) {
    b.vx *= 560 / speed;
    b.vy *= 560 / speed;
  }
}
// Swept circle against rectangle faces AND rounded corners (no expanded-box false corner hits).
function rectContacts(b, rect, dt) {
  const out = [];
  const { x, y, w, h } = rect;
  const { vx, vy, r } = b;
  const face = (time, nx, ny, along, low, high) => {
    if (
      time >= -EPS &&
      time <= dt + EPS &&
      along >= low - EPS &&
      along <= high + EPS
    )
      out.push({ t: Math.max(0, time), nx, ny });
  };
  if (vx > EPS) {
    const t = (x - r - b.x) / vx;
    face(t, -1, 0, b.y + vy * t, y, y + h);
  }
  if (vx < -EPS) {
    const t = (x + w + r - b.x) / vx;
    face(t, 1, 0, b.y + vy * t, y, y + h);
  }
  if (vy > EPS) {
    const t = (y - r - b.y) / vy;
    face(t, 0, -1, b.x + vx * t, x, x + w);
  }
  if (vy < -EPS) {
    const t = (y + h + r - b.y) / vy;
    face(t, 0, 1, b.x + vx * t, x, x + w);
  }
  const speed2 = vx * vx + vy * vy;
  if (speed2 < EPS) return out;
  for (const [cx, cy, sx, sy] of [
    [x, y, -1, -1],
    [x + w, y, 1, -1],
    [x, y + h, -1, 1],
    [x + w, y + h, 1, 1],
  ]) {
    const dx = b.x - cx,
      dy = b.y - cy,
      dot = dx * vx + dy * vy;
    const disc = dot * dot - speed2 * (dx * dx + dy * dy - r * r);
    if (disc < 0) continue;
    const t = (-dot - Math.sqrt(disc)) / speed2;
    if (t < -EPS || t > dt + EPS) continue;
    const nx = (b.x + vx * t - cx) / r,
      ny = (b.y + vy * t - cy) / r;
    if (nx * sx >= -EPS && ny * sy >= -EPS && vx * nx + vy * ny < -EPS)
      out.push({ t: Math.max(0, t), nx, ny });
  }
  return out;
}
function tick(s, dt, events) {
  const b = s.ball;
  boundSpeed(b);
  let left = dt;
  for (
    let iteration = 0;
    iteration < 8 && left > EPS && s.mode === "playing";
    iteration++
  ) {
    const hits = [];
    const wall = (t, nx, ny) => {
      if (t >= -EPS && t <= left + EPS)
        hits.push({ t: Math.max(0, t), nx, ny, type: "wall" });
    };
    if (b.vx < 0) wall((b.r - b.x) / b.vx, 1, 0);
    if (b.vx > 0) wall((WORLD.width - b.r - b.x) / b.vx, -1, 0);
    if (b.vy < 0) wall((b.r - b.y) / b.vy, 0, 1);
    for (const brick of s.bricks)
      if (brick.alive)
        for (const hit of rectContacts(b, brick, left))
          hits.push({ ...hit, type: "brick", brick });
    const p = s.paddle;
    // Only the upper face catches a descending ball; a miss cannot bounce from below.
    if (b.vy > 0 && b.y <= p.y - b.r + EPS) {
      const t = (p.y - b.r - b.y) / b.vy,
        x = b.x + b.vx * t;
      if (
        t >= -EPS &&
        t <= left + EPS &&
        x >= p.x - p.w / 2 - b.r / 2 &&
        x <= p.x + p.w / 2 + b.r / 2
      )
        hits.push({ t: Math.max(0, t), nx: 0, ny: -1, type: "paddle" });
    }
    if (!hits.length) {
      b.x += b.vx * left;
      b.y += b.vy * left;
      left = 0;
      break;
    }
    const first = Math.min(...hits.map((h) => h.t));
    const contacts = hits.filter((h) => Math.abs(h.t - first) < 1e-6);
    b.x += b.vx * first;
    b.y += b.vy * first;
    left -= first;
    if (contacts.some((h) => h.type === "paddle")) {
      const speed = Math.min(
        560,
        Math.max(380 + s.stage * 35, Math.hypot(b.vx, b.vy) + 3),
      );
      let offset = clamp((b.x - p.x) / (p.w / 2), -1, 1);
      if (Math.abs(offset) < 0.12) offset = (b.vx < 0 ? -1 : 1) * 0.12;
      const angle = offset * Math.PI * 0.34;
      b.vx = Math.sin(angle) * speed;
      b.vy = -Math.cos(angle) * speed;
      s.combo = 0;
      b.y = p.y - b.r - 0.001;
      events.push({ type: "paddle", x: b.x, y: b.y });
    } else {
      let nx = 0,
        ny = 0;
      for (const h of contacts) {
        nx += h.nx;
        ny += h.ny;
        if (h.brick?.alive) {
          h.brick.alive = false;
          s.score += 100;
          s.combo++;
          events.push({
            type: "brick",
            x: h.brick.x + h.brick.w / 2,
            y: h.brick.y + h.brick.h / 2,
            tone: h.brick.tone,
          });
        }
      }
      const length = Math.hypot(nx, ny);
      if (length > EPS) {
        nx /= length;
        ny /= length;
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 2 * dot * nx;
          b.vy -= 2 * dot * ny;
        }
        b.x += nx * 0.001;
        b.y += ny * 0.001;
      }
      // Avoid effectively horizontal trajectories after rounded-corner rebounds.
      const speed = Math.hypot(b.vx, b.vy);
      if (Math.abs(b.vy) < speed * 0.32) {
        b.vy = (b.vy < 0 ? -1 : 1) * speed * 0.32;
        b.vx = (b.vx < 0 ? -1 : 1) * Math.sqrt(speed * speed - b.vy * b.vy);
      }
      events.push({ type: "impact", x: b.x, y: b.y });
    }
    if (!s.bricks.some((brick) => brick.alive)) {
      s.mode = s.stage === 2 ? "complete" : "stage-clear";
      events.push({ type: s.mode });
      break;
    }
  }
  if (b.y > WORLD.height + b.r && s.mode === "playing") {
    s.lives--;
    s.combo = 0;
    s.mode = s.lives ? "ready" : "gameover";
    dock(s);
    events.push({ type: s.lives ? "life-lost" : "gameover" });
  }
}
export function step(s, dt) {
  if (s.mode !== "playing" || !Number.isFinite(dt) || dt <= 0) return [];
  const events = [];
  let remaining = Math.min(dt, 0.05);
  s.elapsed += remaining;
  while (remaining > EPS && s.mode === "playing") {
    const slice = Math.min(remaining, 1 / 240);
    tick(s, slice, events);
    remaining -= slice;
  }
  return events;
}
