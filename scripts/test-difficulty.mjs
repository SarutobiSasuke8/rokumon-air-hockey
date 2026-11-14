import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadTs } from "./lib/load-ts.mjs";

const { TABLE, SIM, AI, AI_PROFILES } = loadTs("src/game/constants.ts");
const { createAi, createRng, stepAi, pickAim } = loadTs("src/game/ai.ts");
const { createWorld, stepWorld } = loadTs("src/game/sim.ts");
const puck = { x: 600, y: TABLE.centerY + 15, vx: -300, vy: 0 };
const mallet = { x: 110, y: TABLE.centerY };
const close = (a, b) => assert(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

for (const difficulty of ["easy", "normal", "hard"]) {
  const profile = AI_PROFILES[difficulty];
  const brain = createAi(() => 0.5, difficulty);
  brain.sinceReadMs = 0;
  const previous = { ...brain.target };
  stepAi(brain, puck, mallet, profile.reactionMs - 1, false);
  assert.equal(brain.target.x, previous.x, `${difficulty}: target x stays latched before reaction time`);
  assert.equal(brain.target.y, previous.y, `${difficulty}: target y stays latched before reaction time`);
  stepAi(brain, puck, mallet, 1, false);
  close(brain.target.y, puck.y);

  // Move toward a distant target without rereading it. Actual displacement,
  // not merely a configuration assertion, must respect the selected cap.
  brain.sinceReadMs = -10000;
  brain.target = { x: 400, y: 400 };
  const next = stepAi(brain, puck, mallet, 100, false);
  close(Math.hypot(next.x - mallet.x, next.y - mallet.y), profile.maxSpeed / 10);

  for (const end of [0, 1]) {
    let calls = 0;
    const aim = pickAim(() => calls++ === 0 ? end : 0, profile);
    close(aim, TABLE.centerY + (end * 2 - 1) * profile.aimErrorPx);
  }
  let calls = 0;
  const reads = [0.5, 0.1, 1];
  const defender = createAi(() => reads[calls++], difficulty);
  stepAi(defender, { ...puck, y: TABLE.centerY }, mallet, 1, false);
  close(defender.target.y, TABLE.centerY + profile.defenceErrorPx);
  assert.equal(calls, difficulty === "hard" ? 2 : 3, "hard keeps the legacy RNG sequence");

  // Explicit seeds reproduce easy/normal's imperfect reads as well as hard.
  const a = createWorld(17, difficulty), b = createWorld(17, difficulty);
  for (let i = 0; i < 800; i++) {
    const target = { x: 720, y: 285 + 120 * Math.sin(i / 70) };
    assert.deepEqual(stepWorld(a, target, SIM.stepMs), stepWorld(b, target, SIM.stepMs));
  }
  assert.deepEqual(a.puck, b.puck);
  assert.deepEqual(a.ai, b.ai);
  assert.equal(a.difficulty, difficulty);
}
assert(AI_PROFILES.easy.maxSpeed < AI_PROFILES.normal.maxSpeed && AI_PROFILES.normal.maxSpeed < AI.maxSpeed);
assert(AI_PROFILES.easy.reactionMs > AI_PROFILES.normal.reactionMs && AI_PROFILES.normal.reactionMs > AI.reactionMs);
assert(AI_PROFILES.easy.aimErrorPx > AI_PROFILES.normal.aimErrorPx && AI_PROFILES.normal.aimErrorPx > AI.aimErrorPx);

// Golden trace captured from the unchanged pre-profile simulation at b07b0d3.
// Covers three seeded ten-second runs, reads, movement, contacts and serves.
const trace = [];
for (const seed of [1, 7, 41]) {
  const world = createWorld(seed), explicit = createWorld(seed, "hard");
  for (let i = 0; i < 2400; i++) {
    const target = { x: 680 + 120 * Math.sin(i / 180), y: 285 + 150 * Math.sin(i / 120) };
    const events = stepWorld(world, target, SIM.stepMs);
    assert.deepEqual(events, stepWorld(explicit, target, SIM.stepMs));
    if (i % 120 === 0) trace.push({ seed, i, puck: { ...world.puck }, ai: { ...world.ai }, player: { ...world.player },
      run: { ...world.run }, target: { ...world.brain.target }, aimY: world.brain.aimY, sinceReadMs: world.brain.sinceReadMs, events });
  }
  assert.deepEqual(world.puck, explicit.puck);
}
assert.equal(createHash("sha256").update(JSON.stringify(trace)).digest("hex"),
  "5e5049dc4df82d3dc9cac5e05de7c88d92f9502c995046d4324784f5f7c6402b", "default hard preserves the original simulation trace");

// Online mode uses two human targets and leaves the AI brain untouched.
const online = createWorld(2, "easy");
online.mode = "online";
const beforeRead = online.brain.sinceReadMs;
const beforeAim = online.brain.aimY;
for (let i = 0; i < 200; i++) stepWorld(online, { x: 700, y: 120 }, SIM.stepMs, { x: 300, y: 450 });
assert(online.ai.x > 290 && online.ai.y > 440, "left human controls the left mallet");
assert(online.player.x > TABLE.centerX && online.ai.x < TABLE.centerX);
assert.equal(online.brain.sinceReadMs, beforeRead);
assert.equal(online.brain.aimY, beforeAim);
console.log("Difficulty checks passed: reaction latching, actual speed caps, aim/defence errors, seeded repeatability, legacy hard trace and two-human targets.");
