import { WORLD, KINDS } from "./core.mjs";

/** Board geometry in world space: 8x8 cells of 80px, centered with a
 *  header band above. WORLD.height leaves room for the cabinet HUD, which
 *  lives in HTML (game.mjs), not on the canvas. */
export const BOARD = Object.freeze({
  originX: 40,
  originY: 90,
  cell: 80,
  gap: 6,
});

const INK = "#102226";
const cellRect = (r, c) => ({
  x: BOARD.originX + c * BOARD.cell + BOARD.gap / 2,
  y: BOARD.originY + r * BOARD.cell + BOARD.gap / 2,
  w: BOARD.cell - BOARD.gap,
  h: BOARD.cell - BOARD.gap,
});

/** Original glyphs, one per kind, drawn in dark ink on the tile color.
 *  Tile identity never relies on color alone. */
function drawGlyph(c, glyph, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  c.strokeStyle = INK;
  c.fillStyle = INK;
  c.lineWidth = 4;
  c.lineCap = "round";
  c.lineJoin = "round";
  if (glyph === "dot") {
    c.beginPath();
    c.arc(cx, cy, 11, 0, Math.PI * 2);
    c.fill();
  } else if (glyph === "zigzag") {
    c.beginPath();
    c.moveTo(x + 12, cy);
    c.lineTo(x + 24, cy - 14);
    c.lineTo(x + 36, cy + 14);
    c.lineTo(x + 48, cy - 14);
    c.lineTo(x + 60, cy);
    c.stroke();
  } else if (glyph === "bars") {
    c.fillRect(x + 24, y + 14, 8, h - 28);
    c.fillRect(x + 42, y + 14, 8, h - 28);
  } else if (glyph === "wave") {
    c.beginPath();
    for (let i = 0; i <= 20; i++) {
      const px = x + 12 + (i / 20) * (w - 24);
      const py = cy + Math.sin((i / 20) * Math.PI * 2) * 13;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
  } else if (glyph === "diode") {
    c.beginPath();
    c.moveTo(x + 18, cy - 15);
    c.lineTo(x + 18, cy + 15);
    c.lineTo(x + 46, cy);
    c.closePath();
    c.fill();
    c.fillRect(x + 50, cy - 17, 5, 34);
  } else if (glyph === "chip") {
    c.strokeRect(x + 20, y + 20, w - 40, h - 40);
    c.lineWidth = 3;
    for (const [px, py, dx, dy] of [
      [cx - 14, y + 20, 0, -8],
      [cx + 14, y + 20, 0, -8],
      [cx - 14, y + h - 20, 0, 8],
      [cx + 14, y + h - 20, 0, 8],
    ]) {
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + dx, py + dy);
      c.stroke();
    }
  }
}

/** Original vector artwork; decoration is bounded and optional. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
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
  draw(s) {
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
    c.fillRect(0, 0, WORLD.width, WORLD.height);
    const glow = c.createRadialGradient(360, 240, 10, 360, 420, 620);
    glow.addColorStop(0, "#152b37");
    glow.addColorStop(1, "#090f1c");
    c.fillStyle = glow;
    c.fillRect(0, 0, WORLD.width, WORLD.height);
    c.strokeStyle = "#213045";
    c.lineWidth = 1;
    c.globalAlpha = 0.4;
    for (let x = 24; x < WORLD.width; x += 40) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, WORLD.height);
      c.stroke();
    }
    for (let y = 24; y < WORLD.height; y += 40) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(WORLD.width, y);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.strokeStyle = "#405266";
    c.lineWidth = 2;
    c.strokeRect(12, 12, WORLD.width - 24, WORLD.height - 24);
    c.font = "600 22px system-ui, sans-serif";
    c.textAlign = "left";
    c.fillStyle = "#8eacbc";
    c.fillText("CIRCUIT MATCH", 40, 56);
    c.textAlign = "right";
    c.fillText(
      s.mode === "playing" || s.mode === "paused"
        ? `${s.movesLeft} MOVES LEFT`
        : s.mode.toUpperCase(),
      WORLD.width - 40,
      56,
    );
    // Tiles.
    for (let r = 0; r < s.rows; r++) {
      for (let col = 0; col < s.cols; col++) {
        const kind = s.board[r][col];
        if (kind < 0) continue;
        const { x, y, w, h } = cellRect(r, col);
        const lifted =
          s.selected && s.selected.r === r && s.selected.c === col;
        const ty = lifted ? y - 6 : y;
        c.shadowColor = KINDS[kind].color;
        c.shadowBlur = this.reduced.matches ? 0 : 14;
        c.fillStyle = KINDS[kind].color;
        c.beginPath();
        c.roundRect(x, ty, w, h, 14);
        c.fill();
        c.shadowBlur = 0;
        c.fillStyle = "#ffffff55";
        c.fillRect(x + 10, ty + 6, w - 20, 3);
        drawGlyph(c, KINDS[kind].glyph, x, ty, w, h);
      }
    }
    // Match flash: fades over 350ms after a resolving swap.
    if (s.lastSwap && !this.reduced.matches) {
      const age = Date.now() - s.lastSwapAt;
      if (age < 350) {
        c.globalAlpha = 1 - age / 350;
        c.fillStyle = "#ffffff";
        for (const [r, col] of s.lastSwap.matched) {
          const { x, y, w, h } = cellRect(r, col);
          c.beginPath();
          c.roundRect(x, y, w, h, 14);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    }
    // Focus: visible dashed outline + corner brackets, never color-only.
    if (["playing", "ready", "paused"].includes(s.mode)) {
      const { x, y, w, h } = cellRect(s.focus.r, s.focus.c);
      c.setLineDash([7, 6]);
      c.strokeStyle = "#ffffff";
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(x - 3, y - 3, w + 6, h + 6, 16);
      c.stroke();
      c.setLineDash([]);
      c.lineWidth = 4;
      const b = 16;
      for (const [bx, by, dx, dy] of [
        [x - 3, y - 3, 1, 1],
        [x + w + 3, y - 3, -1, 1],
        [x - 3, y + h + 3, 1, -1],
        [x + w + 3, y + h + 3, -1, -1],
      ]) {
        c.beginPath();
        c.moveTo(bx + dx * b, by);
        c.lineTo(bx, by);
        c.lineTo(bx, by + dy * b);
        c.stroke();
      }
    }
    // Selection: solid lime ring around the chosen tile.
    if (s.selected) {
      const { x, y, w, h } = cellRect(s.selected.r, s.selected.c);
      c.strokeStyle = "#b8ff63";
      c.lineWidth = 4;
      c.beginPath();
      c.roundRect(x - 5, y - 11, w + 10, h + 10, 18);
      c.stroke();
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
      this.play("select");
    } catch {
      this.failed = true;
      this.muted = true;
    }
  }
  play(type) {
    if (this.muted || !this.context || this.context.state !== "running") return;
    try {
      const now = this.context.currentTime;
      if (now - this.last < 0.03) return;
      this.last = now;
      const frequencies = {
        select: 520,
        swap: 440,
        match: 660,
        nomatch: 180,
        shuffle: 330,
        win: 880,
        lose: 130,
      };
      if (!frequencies[type]) return;
      const osc = this.context.createOscillator(),
        gain = this.context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequencies[type], now);
      osc.frequency.exponentialRampToValueAtTime(
        frequencies[type] * 0.7,
        now + 0.12,
      );
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.008);
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
