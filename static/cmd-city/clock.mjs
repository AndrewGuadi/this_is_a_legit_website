export function createClock() {
  return { running: false, speed: 1, accumulator: 0 };
}
export function setRunning(c, r) {
  c.running = !!r;
  c.accumulator = 0;
}
export function setSpeed(c, s) {
  if (![1, 2, 4].includes(s)) throw Error("Speed must be 1, 2 or 4.");
  c.speed = s;
  c.accumulator = 0;
}
export function advanceClock(c, elapsed) {
  if (!c.running || !Number.isFinite(elapsed) || elapsed <= 0) return 0;
  c.accumulator += Math.min(1, elapsed) * c.speed;
  const months = Math.min(2, Math.floor((c.accumulator + 1e-9) / 2));
  c.accumulator = Math.max(0, c.accumulator - months * 2);
  return months;
}
