// Rokumon SDK checks: the optional bridge forwards calls when present and is
// silent when absent, and the real match-end path reports exactly once.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { loadTs } from "./lib/load-ts.mjs";

const code = ts.transpileModule(readFileSync("src/integrations/hub.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sdk = (present, calls) => {
  const exports = {};
  const window = present ? { Hub: Object.fromEntries(["ready", "score", "gameOver", "event"].map((name) => [name, (...args) => calls.push({ name, args })])) } : {};
  vm.runInNewContext(code, { exports, window });
  return exports;
};
for (const present of [true, false]) {
  const calls = [];
  const { hub } = sdk(present, calls);
  hub.ready(); hub.score(7); hub.gameOver(7, 42000); hub.event("match-won", { playerScore: 7, opponentScore: 3, seconds: 42 });
  assert.equal(calls.length, present ? 4 : 0);
}
console.log("SDK forwarding and absent SDK checks passed");

const constants = loadTs("src/game/constants.ts");
for (const present of [true, false]) {
  for (const winner of ["player", "ai"]) {
    const calls = [];
    const stubs = { phaser: { Scene: class {} }, "../integrations/hub.js": sdk(present, calls), "../systems/audio.js": { sfx: { matchEnd() {}, goal() {} } } };
    const { GameScene } = loadTs("src/scenes/GameScene.ts", stubs);
    const { createWorld, stepWorld } = loadTs("src/game/sim.ts", stubs);
    const world = createWorld(9);
    Object.assign(world.run, { status: "playing", playerScore: winner === "player" ? 6 : 3, aiScore: winner === "ai" ? 6 : 3, elapsedMs: 42000 });
    const scene = Object.assign(Object.create(GameScene.prototype), { world, game: { events: { emit() {} } }, juiceGoal() {} });
    // Drive the real simulation into the winner's goal and hand its events to the scene.
    Object.assign(world.puck, winner === "player" ? { x: constants.TABLE.x0 + 5, vx: -900 } : { x: constants.TABLE.x1 - 5, vx: 900 }, { y: constants.TABLE.centerY, vy: 0 });
    world.ai = { x: 300, y: 120 };
    world.player = { x: 700, y: 120 };
    for (let i = 0; i < 2000; i += 1) for (const e of stepWorld(world, world.player, constants.SIM.stepMs)) if (e.type === "goal") scene.onGoal(e.scorer);
    assert.equal(world.run.status, "complete");
    assert.equal(world.run.winner, winner);
    if (present) {
      const names = calls.map((c) => c.name);
      assert.deepEqual(names, winner === "player" ? ["score", "gameOver", "event"] : ["score", "gameOver"]);
      assert.equal(calls[0].args[0], world.run.playerScore);
      if (winner === "player") {
        assert.equal(calls[2].args[0], "match-won");
        assert.equal(JSON.stringify(calls[2].args[1]), JSON.stringify({ playerScore: 7, opponentScore: 3, seconds: Math.round(world.run.elapsedMs / 1000) }));
      }
    } else assert.equal(calls.length, 0);
  }
}
console.log("Real match-end path reports once (match-won only on a player win) and stays playable without the SDK");
