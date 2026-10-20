import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD,
  createGame,
  launch,
  movePaddle,
  pause,
  resume,
  advanceStage,
  step,
} from "../../static/neon-breaker/core.mjs";
const brick = (x = 400, y = 200) => ({
  x,
  y,
  w: 72,
  h: 24,
  alive: true,
  tone: 0,
});
function fixture() {
  return {
    mode: "playing",
    priorMode: null,
    stage: 0,
    score: 0,
    lives: 3,
    combo: 0,
    paddle: { x: 480, y: 550, w: 132, h: 14 },
    ball: { x: 436, y: 250, vx: 0, vy: -480, r: 8 },
    bricks: [brick(), brick(700, 100)],
    elapsed: 0,
  };
}
const simulate = (s, seconds) => {
  for (let i = 0; i < Math.ceil(seconds * 240); i++) step(s, 1 / 240);
};
test("new run has three lives, original first stage and waits for intentional launch", () => {
  const s = createGame();
  assert.ok(s, "new run exists");
  assert.equal(s.mode, "ready");
  assert.equal(s.lives, 3);
  assert.equal(s.score, 0);
  assert.ok(s.bricks.length >= 18);
  assert.equal(s.ball.vx, 0);
  assert.equal(s.ball.vy, 0);
});
test("launch starts only a ready ball and repeated launch cannot change trajectory", () => {
  const s = fixture();
  s.mode = "ready";
  s.ball.vx = s.ball.vy = 0;
  launch(s);
  assert.equal(s.mode, "playing");
  assert.ok(s.ball.vy < 0);
  const b = { ...s.ball };
  launch(s);
  assert.deepEqual(s.ball, b);
});
test("paddle clamps to field and docked ball follows", () => {
  const s = fixture();
  s.mode = "ready";
  movePaddle(s, -100);
  assert.equal(s.paddle.x, 66);
  assert.equal(s.ball.x, 66);
  movePaddle(s, 1100);
  assert.equal(s.paddle.x, 894);
  assert.equal(s.ball.x, 894);
});
test("wall contacts reflect without escaping", () => {
  const s = fixture();
  s.ball = { x: 9, y: 350, vx: -400, vy: -200, r: 8 };
  step(s, 0.02);
  assert.ok(s.ball.vx > 0);
  assert.ok(s.ball.x >= 8);
  s.ball.y = 9;
  s.ball.vy = -400;
  step(s, 0.02);
  assert.ok(s.ball.vy > 0);
});
test("brick hit reflects and scores exactly once", () => {
  const s = fixture();
  simulate(s, 0.1);
  assert.equal(s.bricks[0].alive, false);
  assert.equal(s.score, 100);
  assert.ok(s.ball.vy > 0);
  simulate(s, 0.02);
  assert.equal(s.score, 100);
});
test("fast thin-brick collision does not tunnel and speed is bounded", () => {
  const s = fixture();
  s.bricks[0].h = 2;
  s.ball.y = 225;
  s.ball.vy = -4000;
  step(s, 0.05);
  assert.equal(s.bricks[0].alive, false);
  assert.ok(Math.hypot(s.ball.vx, s.ball.vy) <= 560.001);
});
test("side brick contact reflects horizontal velocity", () => {
  const s = fixture();
  s.ball = { x: 380, y: 212, vx: 480, vy: 80, r: 8 };
  step(s, 0.05);
  assert.equal(s.bricks[0].alive, false);
  assert.ok(s.ball.vx < 0);
});
test("corner contact reflects away from corner", () => {
  const s = fixture();
  s.ball = { x: 385, y: 185, vx: 300, vy: 300, r: 8 };
  step(s, 0.05);
  assert.equal(s.bricks[0].alive, false);
  assert.ok(s.ball.vx < 0 && s.ball.vy < 0);
});
test("simultaneous adjacent contacts destroy each brick once", () => {
  const s = fixture();
  s.bricks = [brick(400, 200), brick(472, 200), brick(700, 100)];
  s.ball = { x: 472, y: 245, vx: 0, vy: -480, r: 8 };
  step(s, 0.05);
  assert.equal(s.bricks.filter((b) => !b.alive).length, 2);
  assert.equal(s.score, 200);
  assert.ok(s.ball.vy > 0);
});
test("paddle returns downward ball with controllable non-stalling angle", () => {
  for (const offset of [-62, 0, 62]) {
    const s = fixture();
    s.ball = { x: 480 + offset, y: 535, vx: 0, vy: 400, r: 8 };
    step(s, 0.05);
    assert.ok(s.ball.vy < -150);
    assert.ok(Math.abs(s.ball.vx) >= 45);
    assert.ok(Math.hypot(s.ball.vx, s.ball.vy) <= 560);
    if (offset) assert.equal(Math.sign(s.ball.vx), Math.sign(offset));
  }
});
test("paddle does not reflect a ball travelling upward from below", () => {
  const s = fixture();
  s.ball = { x: 480, y: 580, vx: 0, vy: -400, r: 8 };
  step(s, 0.05);
  assert.ok(s.ball.vy < 0);
  assert.ok(s.ball.y < 580);
});
test("miss costs exactly one life, docks ball and waits for launch", () => {
  const s = fixture();
  s.ball.y = 610;
  s.ball.vy = 400;
  step(s, 0.01);
  assert.equal(s.lives, 2);
  assert.equal(s.mode, "ready");
  const snapshot = structuredClone(s);
  simulate(s, 1);
  assert.deepEqual(s, snapshot);
});
test("third miss ends game and cannot be relaunched", () => {
  const s = fixture();
  s.lives = 1;
  s.ball.y = 610;
  s.ball.vy = 400;
  step(s, 0.01);
  assert.equal(s.lives, 0);
  assert.equal(s.mode, "gameover");
  launch(s);
  assert.equal(s.mode, "gameover");
});
test("pause freezes all simulation state and requires explicit resume", () => {
  const s = fixture();
  pause(s);
  assert.equal(s.mode, "paused");
  const snapshot = structuredClone(s);
  simulate(s, 2);
  assert.deepEqual(s, snapshot);
  resume(s);
  assert.equal(s.mode, "playing");
  step(s, 0.01);
  assert.notEqual(s.ball.y, snapshot.ball.y);
});
test("ready pause resumes to ready without launching", () => {
  const s = fixture();
  s.mode = "ready";
  pause(s);
  assert.equal(s.mode, "paused");
  resume(s);
  assert.equal(s.mode, "ready");
});
test("cleared stage waits, then loads distinct formation without losing score or lives", () => {
  const s = fixture();
  s.bricks = [brick()];
  simulate(s, 0.1);
  assert.equal(s.mode, "stage-clear");
  const score = s.score;
  const old = structuredClone(s.bricks);
  advanceStage(s);
  assert.equal(s.stage, 1);
  assert.equal(s.mode, "ready");
  assert.equal(s.score, score);
  assert.equal(s.lives, 3);
  assert.notDeepEqual(s.bricks, old);
});
test("third cleared stage completes run and cannot advance past final stage", () => {
  const s = fixture();
  s.stage = 2;
  s.bricks = [brick()];
  simulate(s, 0.1);
  assert.equal(s.mode, "complete");
  advanceStage(s);
  assert.equal(s.stage, 2);
  assert.equal(s.mode, "complete");
});
test("large time jumps are capped and invalid dt cannot corrupt state", () => {
  const s = fixture();
  s.ball.y = 400;
  s.ball.vy = -200;
  step(s, 60);
  assert.ok(s.ball.y >= 380 && s.ball.y < 400);
  const snapshot = structuredClone(s);
  for (const dt of [NaN, Infinity, -1, 0]) step(s, dt);
  assert.deepEqual(s, snapshot);
});
test("equal fixed input histories produce equal worlds", () => {
  const a = createGame(),
    b = createGame();
  assert.ok(a && b);
  launch(a);
  launch(b);
  for (let i = 0; i < 1200; i++) {
    movePaddle(a, 480 + 200 * Math.sin(i / 80));
    movePaddle(b, 480 + 200 * Math.sin(i / 80));
    step(a, 1 / 240);
    step(b, 1 / 240);
  }
  assert.deepEqual(a, b);
});
test("an unmodified run can clear all three authored formations through normal paddle input", () => {
  const s = createGame();
  const stages = [];
  for (
    let i = 0;
    i < 240 * 600 && !["complete", "gameover"].includes(s.mode);
    i++
  ) {
    if (s.mode === "ready") launch(s);
    if (s.mode === "stage-clear") {
      stages.push(s.stage);
      advanceStage(s);
    }
    movePaddle(s, s.ball.x + 32 * Math.sin(i / 270));
    step(s, 1 / 240);
  }
  assert.equal(s.mode, "complete");
  assert.deepEqual(stages, [0, 1]);
  assert.equal(s.score, 7000);
  assert.ok(s.lives > 0);
  assert.ok(s.elapsed < 600);
});
