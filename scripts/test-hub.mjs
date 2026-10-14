import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(readFileSync("src/integrations/hub.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
for (const present of [true, false]) {
  const calls = []; const exports = {};
  const window = present ? { Hub: Object.fromEntries(["ready", "score", "gameOver", "event"].map(name => [name, (...args) => calls.push({ name, args })])) } : {};
  vm.runInNewContext(code, { exports, window });
  exports.hub.ready(); exports.hub.score(7); exports.hub.gameOver(7, 42000); exports.hub.event("match-won", { playerScore: 7, opponentScore: 3, seconds: 42 });
  assert.equal(calls.length, present ? 4 : 0);
  if (present) assert.deepEqual(calls.map(c => c.name), ["ready", "score", "gameOver", "event"]);
}
console.log("SDK forwarding and absent SDK checks passed");

const constants = {};
vm.runInNewContext(ts.transpileModule(readFileSync("src/game/constants.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: constants });
for (const present of [true, false]) {
  const calls = []; const exports = {};
  const sdkExports = {}; const window = present ? { Hub: Object.fromEntries(["ready", "score", "gameOver", "event"].map(name => [name, (...args) => calls.push({ name, args })])) } : {};
  vm.runInNewContext(code, { exports: sdkExports, window });
  const imports = { "phaser": { default: { Scene: class {} } }, "../game/constants.js": constants, "../integrations/hub.js": sdkExports };
  const sceneCode = ts.transpileModule(readFileSync("src/scenes/GameScene.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(sceneCode, { exports, require: name => imports[name] });
  const scene = { state: { status: "playing", playerScore: 6, aiScore: 3, elapsedMs: 42000 }, game: { events: { emit() {} } }, juiceGoal() {}, time: { delayedCall() {} } };
  // Audio is another optional side effect for this renderer-free goal probe.
  imports["../systems/audio.js"] = { sfx: { matchEnd() {} } };
  // Imports are bound during module evaluation, so reload after adding audio.
  vm.runInNewContext(sceneCode, { exports, require: name => imports[name] });
  exports.GameScene.prototype.onGoal.call(scene, "player");
  assert.equal(scene.state.status, "complete");
  assert.equal(scene.state.winner, "player");
  exports.GameScene.prototype.onGoal.call(scene, "player");
  if (present) {
    assert.deepEqual(calls.map(c => c.name), ["score", "gameOver", "event"]);
    assert.equal(calls[0].args[0], 7);
    assert.equal(calls[1].args[1], 42000);
    assert.equal(calls[2].args[0], "match-won");
    assert.equal(JSON.stringify(calls[2].args[1]), JSON.stringify({ playerScore: 7, opponentScore: 3, seconds: 42 }));
  } else assert.equal(calls.length, 0);
}
console.log("Actual match-end path forwards once and remains playable without SDK");
