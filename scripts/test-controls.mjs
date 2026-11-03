// Input checks on the shipped input module and GameScene, without a renderer.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { loadTs } from "./lib/load-ts.mjs";

const Phaser = {
  Scene: class {},
  Math: { Clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)) },
  Input: { Keyboard: { JustDown: (key) => { const down = !!key.justDown; key.justDown = false; return down; } } },
};
const stubs = { phaser: Phaser };
const { createPlayerActions } = loadTs("src/systems/input.ts", stubs);
const { GameScene } = loadTs("src/scenes/GameScene.ts", stubs);
const { createWorld, stepWorld } = loadTs("src/game/sim.ts", stubs);
const { SIM, TABLE, PADDLE } = loadTs("src/game/constants.ts", stubs);

const input = new EventEmitter();
let keys;
input.keyboard = { addKeys: (map) => (keys = Object.fromEntries(Object.keys(map).map((k) => [k, { isDown: false }]))) };
const actions = createPlayerActions({ input });
const world = createWorld(1);
const scene = Object.assign(Object.create(GameScene.prototype), { actions, world, keyTarget: null });
const target = () => GameScene.prototype.playerTarget.call(scene);
const settle = (ms = 300) => {
  for (let t = 0; t < ms; t += SIM.stepMs) stepWorld(world, target(), SIM.stepMs);
};
let checks = 0;
const eq = (a, b, message) => (assert.equal(Math.round(a), b, message), (checks += 1));

input.emit("pointermove", { x: 700, y: 200 });
settle();
eq(world.player.x, 700, "mouse hover moves the mallet (no click needed)");
eq(world.player.y, 200, "mallet reaches the pointer");
input.emit("pointerdown", { x: 710, y: 300 });
settle();
eq(world.player.y, 300, "tap or click moves the mallet to the finger");
keys.up.isDown = true;
settle(100);
assert.ok(world.player.y < 300 - 40, "keyboard takes over while a key is held");
checks += 1;
keys.up.isDown = false;
const yAfterKeys = world.player.y;
settle();
eq(world.player.y, Math.round(yAfterKeys), "releasing keys never snaps back to the old pointer position");
input.emit("pointermove", { x: 750, y: 330 });
settle();
eq(world.player.y, 330, "the next pointer move takes control back");
input.emit("pointermove", { x: 100, y: 1000 });
settle();
eq(world.player.x, TABLE.centerX + PADDLE.radius + PADDLE.centreGap, "mallet stops at the centre line");
eq(world.player.y, TABLE.y1 - PADDLE.radius, "mallet stops at the side wall");
const from = { ...world.player };
input.emit("pointermove", { x: 900, y: 100 });
stepWorld(world, target(), SIM.stepMs);
const moved = Math.hypot(world.player.x - from.x, world.player.y - from.y);
assert.ok(moved > 10 && moved <= (PADDLE.playerMaxSpeed * SIM.stepMs) / 1000 + 1e-6, "a flick is spread over steps, not teleported");
checks += 1;

for (const status of ["serving", "playing", "complete"]) {
  let restarted = false;
  const context = {
    state: { status },
    actions: { restartPressed: () => true },
    scene: { stop: (key) => assert.equal(key, "UI"), start: (key) => { assert.equal(key, "Game"); restarted = true; } },
  };
  GameScene.prototype.update.call(context, 0, 100);
  assert.equal(restarted, true, `R restarts during ${status}`);
  checks += 1;
}
console.log(`${checks} mouse, touch, keyboard and restart checks passed`);
