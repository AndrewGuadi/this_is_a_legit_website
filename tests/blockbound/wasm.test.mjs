import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function load() {
  const encoded = await readFile(new URL("../../static/blockbound/blockbound.wasm.base64", import.meta.url), "utf8");
  const bytes = Buffer.from(encoded, "base64");
  const { instance } = await WebAssembly.instantiate(bytes, {});
  return instance.exports;
}

test("WebAssembly exports a bounded framebuffer and playable C state", async () => {
  const game = await load();
  for (const name of ["bb_reset", "bb_start", "bb_step", "bb_render", "bb_interact", "bb_toggle_pause"]) {
    assert.equal(typeof game[name], "function", name);
  }
  assert.equal(game.memory.buffer.byteLength, 1024 * 1024);
  game.bb_reset();
  assert.equal(game.bb_mode(), 0);
  game.bb_start();
  assert.equal(game.bb_mode(), 1);
  assert.equal(game.bb_shards(), 0);
  const startY = game.bb_player_y();
  game.bb_set_input(1);
  for (let i = 0; i < 60; i++) game.bb_step(1 / 60);
  game.bb_set_input(0);
  assert.ok(game.bb_player_y() < startY - 0.5);
  game.bb_toggle_pause();
  const pausedY = game.bb_player_y();
  game.bb_set_input(1);
  game.bb_step(1);
  assert.equal(game.bb_player_y(), pausedY);
  game.bb_set_input(0);
  game.bb_render();
  const pixels = new Uint8ClampedArray(game.memory.buffer, game.bb_framebuffer(), 320 * 180 * 4);
  assert.equal(pixels.length, 230400);
  for (let i = 3; i < pixels.length; i += 4096) assert.equal(pixels[i], 255);
});
