import { WORLD, STAGES } from "./core.mjs";
export const PALETTE = ["#baff73", "#76e5ed", "#ff9c84"];
/** Original vector artwork; all decoration is bounded and optional. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.particles = [];
    this.trail = [];
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
  }
  resize() {
    const width = this.canvas.getBoundingClientRect().width;
    const scale = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * scale);
    this.canvas.height = Math.round(
      ((width * scale) / WORLD.width) * WORLD.height,
    );
  }
  clear() {
    this.particles = [];
    this.trail = [];
  }
  events(events) {
    if (this.reduced.matches) return;
    for (const event of events)
      if (event.type === "brick") {
        for (let i = 0; i < 8 && this.particles.length < 120; i++) {
          const angle = (i * Math.PI) / 4;
          this.particles.push({
            x: event.x,
            y: event.y,
            vx: Math.cos(angle) * 90,
            vy: Math.sin(angle) * 90,
            life: 0.4,
            color: PALETTE[event.tone],
          });
        }
      }
  }
  draw(s, dt) {
    const c = this.ctx;
    if (!c) return;
    c.setTransform(
      this.canvas.width / WORLD.width,
      0,
      0,
      this.canvas.height / WORLD.height,
      0,
      0,
    );
    c.fillStyle = "#090f1c";
    c.fillRect(0, 0, 960, 600);
    const glow = c.createRadialGradient(480, 170, 10, 480, 220, 580);
    glow.addColorStop(0, "#152b37");
    glow.addColorStop(1, "#090f1c");
    c.fillStyle = glow;
    c.fillRect(0, 0, 960, 600);
    c.strokeStyle = "#213045";
    c.lineWidth = 1;
    c.globalAlpha = 0.45;
    for (let x = 24; x < 960; x += 38) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 600);
      c.stroke();
    }
    for (let y = 16; y < 600; y += 38) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(960, y);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.strokeStyle = "#405266";
    c.strokeRect(12, 12, 936, 576);
    c.strokeStyle = PALETTE[s.stage];
    c.lineWidth = 3;
    for (const x of [12, 948])
      for (const y of [12, 588]) {
        c.beginPath();
        c.moveTo(x, y + (y === 12 ? 24 : -24));
        c.lineTo(x, y);
        c.lineTo(x + (x === 12 ? 24 : -24), y);
        c.stroke();
      }
    c.font = "11px monospace";
    c.fillStyle = "#8eacbc";
    c.textAlign = "left";
    c.fillText(
      `SECTOR 0${s.stage + 1} / ${STAGES[s.stage].name.toUpperCase()}`,
      32,
      40,
    );
    c.textAlign = "right";
    c.fillText(
      `${s.bricks.filter((b) => b.alive).length} SIGNALS REMAINING`,
      928,
      40,
    );
    for (const b of s.bricks) {
      if (!b.alive) continue;
      const tone = PALETTE[(b.tone + s.stage) % 3];
      c.fillStyle = tone;
      c.beginPath();
      c.roundRect(b.x, b.y, b.w, b.h, 5);
      c.fill();
      c.fillStyle = "#ffffff80";
      c.fillRect(b.x + 8, b.y + 4, b.w - 16, 2);
      c.fillStyle = "#102226";
      c.globalAlpha = 0.55;
      c.fillRect(b.x + 9, b.y + 11, 3, 5);
      c.fillRect(b.x + b.w - 12, b.y + 11, 3, 5);
      c.globalAlpha = 1;
    }
    const moving = s.mode === "playing";
    if (this.reduced.matches) {
      this.trail = [];
      this.particles = [];
    }
    if (moving && !this.reduced.matches) {
      this.trail.push({ x: s.ball.x, y: s.ball.y });
      if (this.trail.length > 9) this.trail.shift();
    }
    if (moving)
      for (const p of this.particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (!this.reduced.matches) {
      for (const [i, p] of this.trail.entries()) {
        c.globalAlpha = (i / this.trail.length) * 0.25;
        c.fillStyle = "#c9faff";
        c.beginPath();
        c.arc(p.x, p.y, 3 + i * 0.4, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    for (const p of this.particles) {
      c.globalAlpha = Math.max(0, p.life / 0.4);
      c.fillStyle = p.color;
      c.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    c.globalAlpha = 1;
    const p = s.paddle;
    c.shadowColor = PALETTE[s.stage];
    c.shadowBlur = this.reduced.matches ? 0 : 15;
    c.fillStyle = PALETTE[s.stage];
    c.beginPath();
    c.roundRect(p.x - p.w / 2, p.y, p.w, p.h, 7);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = "#f5fff4";
    c.fillRect(p.x - 20, p.y + 3, 40, 3);
    c.fillStyle = "#183240";
    c.fillRect(p.x - p.w / 2 + 10, p.y + 4, 4, 6);
    c.fillRect(p.x + p.w / 2 - 14, p.y + 4, 4, 6);
    c.shadowColor = "#b6f4ff";
    c.shadowBlur = this.reduced.matches ? 0 : 16;
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    if (s.mode === "ready") {
      c.setLineDash([4, 7]);
      c.strokeStyle = "#9ac5cd";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(s.ball.x, s.ball.y - 16);
      c.lineTo(s.ball.x + 24, s.ball.y - 90);
      c.stroke();
      c.setLineDash([]);
    }
  }
}
/** Short original oscillator sounds. Never initialized until explicit sound activation. */
export class Sound {
  constructor() {
    this.context = null;
    this.muted = true;
    this.failed = false;
    this.last = 0;
  }
  async toggle() {
    if (!this.muted) {
      this.muted = true;
      try {
        await this.context?.suspend();
      } catch {}
      return;
    }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error("unavailable");
      this.context ??= new Audio();
      await this.context.resume();
      this.failed = false;
      this.muted = false;
      this.play("launch");
    } catch {
      this.failed = true;
      this.muted = true;
    }
  }
  play(type) {
    if (this.muted || !this.context || this.context.state !== "running") return;
    try {
      const now = this.context.currentTime;
      if (now - this.last < 0.025) return;
      this.last = now;
      const frequencies = {
        brick: 660,
        paddle: 220,
        launch: 440,
        "life-lost": 130,
        "stage-clear": 880,
        complete: 1047,
        gameover: 98,
      };
      if (!frequencies[type]) return;
      const osc = this.context.createOscillator(),
        gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequencies[type], now);
      osc.frequency.exponentialRampToValueAtTime(
        frequencies[type] * 0.65,
        now + 0.12,
      );
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now);
      osc.stop(now + 0.17);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      this.failed = true;
      this.muted = true;
    }
  }
}
