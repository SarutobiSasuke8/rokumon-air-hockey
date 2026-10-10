import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { EventEmitter } from "node:events";

// Exercise the shipped input and scene methods without a renderer.
const Phaser = {
  Scene: class {},
  Math: { Clamp: (n, lo, hi) => Math.max(lo, Math.min(hi, n)) },
  Input: { Keyboard: { JustDown: (key) => { const down = !!key.justDown; key.justDown = false; return down; } } },
};
function load(file, imports = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => name === "phaser" ? Phaser : imports[name] });
  return exports;
}
const { createPlayerActions } = load("../src/systems/input.ts");
const constants = load("../src/game/constants.ts");
const { GameScene } = load("../src/scenes/GameScene.ts", { "../game/constants.js": constants });
const input = new EventEmitter();
let keys;
input.keyboard = { addKeys: (map) => keys = Object.fromEntries(Object.keys(map).map(k => [k, { isDown: false }])) };
const actions = createPlayerActions({ input });
const paddle = { x: 700, y: 270, setPosition(x, y) { this.x = x; this.y = y; }, body: { updateFromGameObject() {} } };
const scene = { actions, playerPaddle: paddle };
const step = () => GameScene.prototype.updatePlayerPaddle.call(scene, 100);

input.emit("pointerdown", { worldX: 710, worldY: 300 });
step();
assert.equal(paddle.y, 300, "drag starts at pointer position");
keys.up.isDown = true;
step();
assert.equal(paddle.y, 258, "keyboard takes control after a pointer gesture");
keys.up.isDown = false;
step();
assert.equal(paddle.y, 258, "releasing keys never snaps back to stale pointer coordinates");
input.emit("pointermove", { isDown: false, wasTouch: false, worldX: 750, worldY: 330 });
step();
assert.equal(paddle.y, 258, "mouse hover does not steal keyboard control");
input.emit("pointermove", { isDown: true, worldX: 750, worldY: 330 });
step();
assert.equal(paddle.y, 330, "a new drag takes control again");
keys.a.isDown = true;
step();
assert.equal(paddle.x, 708, "WASD also takes over after dragging");

for (const status of ["serving", "playing", "complete"]) {
  let restarted = false;
  const context = {
    state: { status }, actions: { restartPressed: () => true },
    scene: { stop: (key) => assert.equal(key, "UI"), start: (key) => { assert.equal(key, "Game"); restarted = true; } },
    updatePlayerPaddle() {}, updateAiPaddle() {}, applyPuckGlide() {}, launchServe() {},
  };
  GameScene.prototype.update.call(context, 0, 100);
  assert.equal(restarted, true, `R restarts during ${status}`);
}
console.log("9 mixed-input and restart checks passed");
