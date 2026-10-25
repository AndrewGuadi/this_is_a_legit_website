import { TOOLS } from "./content.mjs";

const ROAD = new Set(["road", "avenue", "bridge"]);
const UNIT = 24;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const shade = (hex, amount) => {
  const value = parseInt(hex.slice(1), 16);
  return `rgb(${clamp((value >> 16) + amount, 0, 255)},${clamp(((value >> 8) & 255) + amount, 0, 255)},${clamp((value & 255) + amount, 0, 255)})`;
};

/** Rendering observes model state. Camera and Canvas are deliberately not simulation state. */
export function createView(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable in this browser.");
  let width = 1000,
    height = 800,
    ratio = 1,
    zoom = 1,
    panX = 0,
    panY = 0;
  let transform = { scale: 1, x: 0, y: 0 },
    mapWidth = 40,
    mapHeight = 32;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    ratio = Math.min(3, window.devicePixelRatio || 1);
    const bw = Math.round(width * ratio),
      bh = Math.round(height * ratio);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
  }
  function camera() {
    const scale =
      Math.min(
        (width - 32) / (mapWidth * UNIT),
        (height - 42) / (mapHeight * UNIT),
      ) * zoom;
    const reachX = (mapWidth * UNIT * scale) / 2,
      reachY = (mapHeight * UNIT * scale) / 2;
    panX = clamp(panX, -reachX, reachX);
    panY = clamp(panY, -reachY, reachY);
    transform = {
      scale,
      x: width / 2 - reachX + panX,
      y: height / 2 - reachY + panY + 7,
    };
  }
  const tileAt = (s, x, y) =>
    x >= 0 && y >= 0 && x < s.width && y < s.height
      ? s.tiles[y * s.width + x]
      : null;
  function cube(x, y, w, d, h, color, windows = false) {
    ctx.fillStyle = "#263d3260";
    ctx.beginPath();
    ctx.moveTo(x + w, y + d);
    ctx.lineTo(x + w + h * 0.48, y + d + h * 0.28);
    ctx.lineTo(x + w + h * 0.48, y + d - h * 0.72);
    ctx.lineTo(x + w, y - h);
    ctx.fill();
    ctx.fillStyle = shade(color, -26);
    ctx.fillRect(x, y - h + d, w, h);
    ctx.fillStyle = shade(color, -48);
    ctx.beginPath();
    ctx.moveTo(x + w, y - h);
    ctx.lineTo(x + w + 3, y - h + 3);
    ctx.lineTo(x + w + 3, y + d);
    ctx.lineTo(x + w, y + d);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(x, y - h, w, d);
    ctx.fillStyle = shade(color, 15);
    ctx.fillRect(x + 1, y - h + 1, w - 2, 1);
    if (windows && h > 7) {
      ctx.fillStyle = "#f1edbc";
      for (let yy = y - h + d + 2; yy < y + d - 1; yy += 4)
        for (let xx = x + 2; xx < x + w - 1; xx += 4)
          ctx.fillRect(xx, yy, 1.8, 1.4);
    }
  }
  function tree(x, y, color = "#3f6a48") {
    ctx.fillStyle = "#243e2a42";
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 3, 4, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b6340";
    ctx.fillRect(x - 0.6, y - 2, 1.3, 6);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6c9665";
    ctx.beginPath();
    ctx.arc(x - 0.7, y - 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  function terrain(s) {
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        const t = tileAt(s, x, y),
          px = x * UNIT,
          py = y * UNIT,
          n = ((x * 73856093) ^ (y * 19349663) ^ s.seed) >>> 0;
        if (t.terrain === "water") {
          ctx.fillStyle = n % 3 ? "#568f9c" : "#5a929c";
          ctx.fillRect(px, py, UNIT, UNIT);
          ctx.strokeStyle = "#9ec8bd50";
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 8 + (n % 6));
          ctx.lineTo(px + 12, py + 7 + (n % 6));
          ctx.moveTo(px + 14, py + 19);
          ctx.lineTo(px + 20, py + 18);
          ctx.stroke();
        } else {
          ctx.fillStyle = ["#83a273", "#819f71", "#86a476", "#7d9d70"][n % 4];
          ctx.fillRect(px, py, UNIT, UNIT);
          ctx.strokeStyle = "#dce6b210";
          ctx.lineWidth = 0.4;
          ctx.strokeRect(px, py, UNIT, UNIT);
          for (const [dx, dy, a, b, c, d] of [
            [-1, 0, px, py, 1.6, UNIT],
            [1, 0, px + UNIT - 1.6, py, 1.6, UNIT],
            [0, -1, px, py, UNIT, 1.6],
            [0, 1, px, py + UNIT - 1.6, UNIT, 1.6],
          ]) {
            if (tileAt(s, x + dx, y + dy)?.terrain === "water") {
              ctx.fillStyle = "#c6c18a";
              ctx.fillRect(a, b, c, d);
            }
          }
          if (t.type === "empty" && n % 7 === 0 && !t.resource) {
            tree(px + 8, py + 10);
            if (n % 3 === 0) tree(px + 17, py + 19, "#50794f");
          }
          if (t.resource && t.type === "empty") {
            ctx.fillStyle =
              t.resource === "oil"
                ? "#555d4d"
                : t.resource === "ore"
                  ? "#c9b28a"
                  : "#455043";
            for (let k = 0; k < 3; k++) {
              ctx.beginPath();
              ctx.ellipse(
                px + 7 + k * 4,
                py + 12 + (k % 2) * 3,
                3,
                2,
                -0.3,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
          }
        }
      }
  }
  function road(s, t, x, y) {
    const px = x * UNIT,
      py = y * UNIT,
      avenue = t.type === "avenue",
      w = avenue ? 17 : 12,
      pad = (UNIT - w) / 2;
    ctx.fillStyle = "#a1b1a0";
    ctx.fillRect(px + 2, py + 2, UNIT - 4, UNIT - 4);
    ctx.fillStyle = t.type === "bridge" ? "#667e80" : "#59686b";
    ctx.fillRect(px + pad, py + pad, w, w);
    const near = (dx, dy) => ROAD.has(tileAt(s, x + dx, y + dy)?.type);
    if (near(-1, 0) || (x === 0 && y === 16))
      ctx.fillRect(px, py + pad, UNIT / 2, w);
    if (near(1, 0)) ctx.fillRect(px + UNIT / 2, py + pad, UNIT / 2, w);
    if (near(0, -1)) ctx.fillRect(px + pad, py, w, UNIT / 2);
    if (near(0, 1)) ctx.fillRect(px + pad, py + UNIT / 2, w, UNIT / 2);
    ctx.strokeStyle = avenue ? "#cfcc9b" : "#b1bba650";
    ctx.lineWidth = avenue ? 0.8 : 0.5;
    ctx.setLineDash([2.4, 2.5]);
    if (near(-1, 0) || near(1, 0) || (x === 0 && y === 16)) {
      ctx.beginPath();
      ctx.moveTo(px, py + 12);
      ctx.lineTo(px + UNIT, py + 12);
      ctx.stroke();
    }
    if (near(0, -1) || near(0, 1)) {
      ctx.beginPath();
      ctx.moveTo(px + 12, py);
      ctx.lineTo(px + 12, py + UNIT);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (t.type === "bridge") {
      ctx.strokeStyle = "#cbd5c0";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(px + pad - 1, py + pad - 1, w + 2, w + 2);
    }
  }
  function building(t, x, y, index) {
    const px = x * UNIT,
      py = y * UNIT,
      d = TOOLS[t.type];
    if (t.type === "empty") return;
    if (t.type === "ruins") {
      ctx.fillStyle = "#756f5b";
      ctx.fillRect(px + 4, py + 5, 16, 15);
      ctx.fillStyle = "#565b4d";
      ctx.fillRect(px + 7, py + 8, 4, 4);
      ctx.fillRect(px + 15, py + 14, 5, 5);
      return;
    }
    if (t.type === "rail") {
      ctx.fillStyle = "#79836b";
      ctx.fillRect(px + 6, py, 12, UNIT);
      ctx.strokeStyle = "#b4ad8f";
      ctx.lineWidth = 1.8;
      for (let k = 3; k < UNIT; k += 4) {
        ctx.beginPath();
        ctx.moveTo(px + 5, py + k);
        ctx.lineTo(px + 19, py + k);
        ctx.stroke();
      }
      ctx.strokeStyle = "#454f4a";
      ctx.beginPath();
      ctx.moveTo(px + 8, py);
      ctx.lineTo(px + 8, py + UNIT);
      ctx.moveTo(px + 16, py);
      ctx.lineTo(px + 16, py + UNIT);
      ctx.stroke();
      return;
    }
    if (!d) return;
    if (t.type === "park") {
      ctx.fillStyle = "#a0bb7d";
      ctx.fillRect(px + 2, py + 2, 20, 20);
      ctx.strokeStyle = "#d7d1a1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 5, py + 17);
      ctx.lineTo(px + 17, py + 5);
      ctx.stroke();
      tree(px + 7, py + 8);
      tree(px + 17, py + 18, "#47794a");
      return;
    }
    if (t.type === "wind") {
      cube(px + 7, py + 13, 10, 7, 4, "#bfd1b7");
      ctx.strokeStyle = "#f4f2d8";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(px + 12, py + 17);
      ctx.lineTo(px + 12, py - 7);
      ctx.stroke();
      const angle = (index % 5) * 0.4;
      for (let a = 0; a < 3; a++) {
        const aa = angle + (a * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(px + 12, py - 7);
        ctx.lineTo(px + 12 + Math.cos(aa) * 9, py - 7 + Math.sin(aa) * 9);
        ctx.stroke();
      }
      return;
    }
    if (t.type === "water" || t.type === "sewage" || t.type === "waterFilter") {
      cube(px + 4, py + 10, 17, 11, 5, "#99b6ad");
      ctx.fillStyle = t.type === "water" || t.type === "waterFilter" ? "#9dd1ce" : "#738b87";
      ctx.beginPath();
      ctx.ellipse(px + 12, py + 5, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d6e3ca";
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }
    if (t.type === "landfill" || t.type === "recycling") {
      ctx.fillStyle = "#a8a783";
      ctx.fillRect(px + 2, py + 2, 20, 20);
      cube(
        px + 5,
        py + 11,
        9,
        9,
        5,
        t.type === "landfill" ? "#ada176" : "#9ebc8b",
      );
      cube(px + 13, py + 6, 7, 8, 3, "#9caa81");
      return;
    }
    if (
      ["residential", "commercial", "industrial", "tower"].includes(t.type) &&
      !t.occupancy
    ) {
      ctx.fillStyle = `${d.color}77`;
      ctx.fillRect(px + 3, py + 3, 18, 18);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(px + 3, py + 3, 18, 18);
      ctx.setLineDash([]);
      ctx.fillStyle = "#243c31";
      ctx.font = "bold 8px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        t.type === "residential"
          ? "R"
          : t.type === "commercial"
            ? "C"
            : t.type === "industrial"
              ? "I"
              : "S",
        px + 12,
        py + 15,
      );
      return;
    }
    const color =
      t.type === "residential"
        ? ["#d9ddba", "#b1c5a0", "#cbd3ad"][index % 3]
        : t.type === "commercial"
          ? "#a4c6c7"
          : t.type === "industrial"
            ? "#c9b08b"
            : d.color;
    let h =
      t.type === "tower"
        ? 36 + (t.level - 1) * 8
        : t.type === "residential" || t.type === "commercial"
          ? [6, 15, 28][t.level - 1]
          : 8 + t.modules * 3;
    if (
      t.type === "academy" ||
      t.type === "hospital" ||
      t.type === "university"
    )
      h = 17 + t.modules * 3;
    cube(px + 4, py + 9, 15, 11, h, color, true);
    if (t.type === "residential" && t.level === 1) {
      ctx.fillStyle = index % 2 ? "#718777" : "#87997b";
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 4);
      ctx.lineTo(px + 11, py - 1);
      ctx.lineTo(px + 21, py + 4);
      ctx.lineTo(px + 19, py + 8);
      ctx.lineTo(px + 4, py + 8);
      ctx.fill();
    }
    if (
      ["industrial", "coalPlant", "factory", "mine", "oilWell"].includes(t.type)
    ) {
      cube(px + 6, py + 6, 3, 3, 13, "#8a8a75");
      if (t.type === "coalPlant") cube(px + 15, py + 7, 4, 4, 17, "#a4a591");
    }
    if (t.type === "clinic" || t.type === "hospital") {
      ctx.fillStyle = "#fff0d8";
      ctx.fillRect(px + 9, py + 10 - h, 5, 1.7);
      ctx.fillRect(px + 10.7, py + 8.3 - h, 1.7, 5);
    }
    if (t.type === "school" || t.type === "university") {
      ctx.fillStyle = "#f5e3b7";
      ctx.fillRect(px + 8, py + 6 - h, 7, 2);
    }
    if (t.enabled === false) {
      ctx.fillStyle = "#263a3570";
      ctx.fillRect(px + 1, py + 1, UNIT - 2, UNIT - 2);
      ctx.strokeStyle = "#f0c49a";
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(px + 7, py + 8);
      ctx.lineTo(px + 17, py + 18);
      ctx.moveTo(px + 17, py + 8);
      ctx.lineTo(px + 7, py + 18);
      ctx.stroke();
    }
    if (t.fire) {
      ctx.fillStyle = "#f4b85d";
      ctx.beginPath();
      ctx.moveTo(px + 7, py + 15);
      ctx.lineTo(px + 10, py + 2);
      ctx.lineTo(px + 13, py + 9);
      ctx.lineTo(px + 17, py + 4);
      ctx.lineTo(px + 19, py + 16);
      ctx.fill();
      ctx.fillStyle = "#ef7f49";
      ctx.beginPath();
      ctx.arc(px + 13, py + 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function dataOverlay(s, m, overlay) {
    if (overlay === "none") return;
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i];
      if (t.terrain === "water" && !ROAD.has(t.type) && !["pollution", "air", "ground", "radiation"].includes(overlay)) continue;
      let color = null;
      if (overlay === "access")
        color = m.access[i]
          ? "#c7ef8090"
          : t.type !== "empty"
            ? "#f5987090"
            : null;
      if (overlay === "power" || overlay === "water")
        color =
          m.access[i] && m.utilities[overlay].ratio >= 0.99
            ? "#7edbcb90"
            : t.type !== "empty"
              ? "#f1ad7190"
              : null;
      if (overlay === "pollution" || overlay === "air")
        color = `rgba(196,79,47,${(m.environment?.air[i] ?? m.pollution[i] ?? 0) / 125})`;
      if (overlay === "ground")
        color = `rgba(178,111,43,${(m.environment?.ground[i] || 0) / 120})`;
      if (overlay === "radiation")
        color = `rgba(145,70,180,${(m.environment?.radiation[i] || 0) / 110})`;
      if (overlay === "landValue")
        color = `rgba(214,239,137,${(m.landValue[i] || 0) / 150})`;
      if (overlay === "traffic" && ROAD.has(t.type)) {
        const n = (m.roadLoad[i] || 0) / (TOOLS[t.type].capacity || 80);
        color = n > 0.8 ? "#ef9861b0" : n > 0.3 ? "#e2ca7d90" : "#8acc9b90";
      }
      if (overlay === "services") {
        const n = Math.max(
          m.coverage.school[i] || 0,
          m.coverage.clinic[i] || 0,
          m.coverage.fire[i] || 0,
          m.coverage.police[i] || 0,
        );
        color = `rgba(134,202,222,${n / 150})`;
      }
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          (i % s.width) * UNIT + 0.5,
          Math.floor(i / s.width) * UNIT + 0.5,
          UNIT - 1,
          UNIT - 1,
        );
      }
    }
  }
  function draw(
    s,
    m,
    selection,
    tool = "inspect",
    overlay = "none",
    hover = null,
  ) {
    mapWidth = s.width;
    mapHeight = s.height;
    resize();
    camera();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#849b77");
    bg.addColorStop(1, "#5e7c61");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.fillStyle = "#193a2c50";
    ctx.fillRect(8, 10, mapWidth * UNIT, mapHeight * UNIT);
    terrain(s);
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        const t = tileAt(s, x, y);
        if (ROAD.has(t.type)) road(s, t, x, y);
      }
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        const t = tileAt(s, x, y);
        if (!ROAD.has(t.type)) building(t, x, y, y * s.width + x);
      }
    dataOverlay(s, m, overlay);
    ctx.strokeStyle = "#dbe8bb90";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, s.width * UNIT, s.height * UNIT);
    if (hover && tool !== "inspect") {
      ctx.fillStyle = tool === "bulldoze" ? "#ffb48588" : "#dcffb277";
      ctx.fillRect(hover.x * UNIT, hover.y * UNIT, UNIT, UNIT);
    }
    if (selection) {
      const x = selection.x * UNIT,
        y = selection.y * UNIT;
      ctx.fillStyle = "#f4ffcf1a";
      ctx.fillRect(x, y, UNIT, UNIT);
      ctx.strokeStyle = "#182d26";
      ctx.lineWidth = 4 / transform.scale;
      ctx.strokeRect(x, y, UNIT, UNIT);
      ctx.strokeStyle = "#efffc7";
      ctx.lineWidth = 2 / transform.scale;
      ctx.strokeRect(x, y, UNIT, UNIT);
    }
    // The region gateway remains visually identifiable at every simulation month.
    ctx.fillStyle = "#f2f3cf";
    ctx.beginPath();
    ctx.moveTo(2, 16 * UNIT + 8);
    ctx.lineTo(10, 16 * UNIT + 12);
    ctx.lineTo(2, 16 * UNIT + 16);
    ctx.fill();
    ctx.restore();
  }
  function pointToTile(clientX, clientY) {
    resize();
    camera();
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(
        (clientX - rect.left - transform.x) / transform.scale / UNIT + 1e-7,
      ),
      y = Math.floor(
        (clientY - rect.top - transform.y) / transform.scale / UNIT + 1e-7,
      );
    return x >= 0 && y >= 0 && x < mapWidth && y < mapHeight ? { x, y } : null;
  }
  function ensureVisible(selection) {
    camera();
    const x = (selection.x + 0.5) * UNIT * transform.scale + transform.x,
      y = (selection.y + 0.5) * UNIT * transform.scale + transform.y;
    if (x < 30 || x > width - 30) panX += width / 2 - x;
    if (y < 35 || y > height - 35) panY += height / 2 - y;
  }
  return {
    draw,
    resize,
    pointToTile,
    ensureVisible,
    pan(dx, dy) {
      panX += dx;
      panY += dy;
    },
    zoom(factor) {
      zoom = clamp(zoom * factor, 0.85, 5);
    },
    reset() {
      zoom = 1;
      panX = 0;
      panY = 0;
    },
  };
}
