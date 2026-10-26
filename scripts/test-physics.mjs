// Physics, rules and AI checks on the shipped simulation (src/game), in Node.
import assert from "node:assert/strict";
import { loadTs } from "./lib/load-ts.mjs";
import { playHeadlessMatch } from "./lib/headless-match.mjs";

const physics = loadTs("src/game/physics.ts");
const sim = loadTs("src/game/sim.ts");
const ai = loadTs("src/game/ai.ts");
const { TABLE, PUCK, PADDLE, MATCH, SIM } = loadTs("src/game/constants.ts");
const { stepPuck, sweptContact, clampMallet, GOAL_TOP, GOAL_BOTTOM } = physics;
const CONTACT = PUCK.radius + PADDLE.radius;
const STEP = SIM.stepMs / 1000;
let checks = 0;
const ok = (value, message) => (assert.ok(value, message), (checks += 1));
const still = (p) => ({ from: { ...p }, to: { ...p } });
const inside = (p) => p.y >= TABLE.y0 + PUCK.radius - 1e-6 && p.y <= TABLE.y1 - PUCK.radius + 1e-6 && Number.isFinite(p.x) && Number.isFinite(p.y);

// 1. Swept contact maths.
ok(sweptContact({ x: 100, y: 0 }, { x: 0, y: 0 }, 40) === 0.6, "head-on contact time");
ok(sweptContact({ x: 100, y: 0 }, { x: -100, y: 0 }, 40) !== null, "a path straight through the mallet is caught");
ok(sweptContact({ x: 100, y: 50 }, { x: -100, y: 50 }, 40) === null, "a clean miss stays a miss");
ok(sweptContact({ x: 10, y: 0 }, { x: 50, y: 0 }, 40) === 0, "an overlap is resolved at once");

// 2. A very fast puck cannot pass through a still mallet, at any step size.
for (const speed of [1100, 3000, 6000, 20000]) {
  for (const dt of [STEP, 1 / 60, 1 / 20]) {
    const mallet = { x: 300, y: 285 };
    const puck = { x: 300 + CONTACT + 60, y: 290, vx: -speed, vy: 0 };
    for (let t = 0; t < 0.2 && puck.vx < 0; t += dt) stepPuck(puck, [still(mallet)], dt);
    ok(puck.x > mallet.x && puck.vx > 0, `puck at ${speed}px/s, dt ${dt.toFixed(4)} bounces off the mallet (x ${puck.x.toFixed(1)})`);
    ok(Math.hypot(puck.vx, puck.vy) <= PUCK.maxSpeed + 1e-9, "rebound respects the speed cap");
  }
}

// 3. A fast mallet swing through a still puck hits it (no tunnelling), in one step.
for (const swing of [200, 400, 900]) {
  const puck = { x: 700, y: 285, vx: 0, vy: 0 };
  const from = { x: 700 + swing / 2, y: 288 };
  const to = { x: 700 - swing / 2, y: 288 };
  stepPuck(puck, [{ from, to }], STEP);
  ok(puck.vx < -100, `a ${swing}px swing in one step sends the puck the swing's way (vx ${puck.vx.toFixed(0)})`);
  ok(Math.hypot(puck.x - to.x, puck.y - to.y) >= CONTACT - 0.01, "puck ends outside the mallet");
}

// 4. Wall fuzz: random shots at top speed never leave the table, at any frame rate.
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
for (let shot = 0; shot < 600; shot += 1) {
  const angle = rand() * Math.PI * 2;
  const puck = { x: TABLE.x0 + 30 + rand() * 820, y: TABLE.y0 + 20 + rand() * 390, vx: Math.cos(angle) * 5000, vy: Math.sin(angle) * 5000 };
  const dt = [STEP, 1 / 60, 1 / 15][shot % 3];
  for (let t = 0; t < 2; t += dt) {
    const r = stepPuck(puck, [], dt);
    if (r.goal) {
      assert.ok(puck.y > GOAL_TOP && puck.y < GOAL_BOTTOM, "goals only go in through the mouth");
      break;
    }
    assert.ok(inside(puck) && puck.x > TABLE.x0 - 60 && puck.x < TABLE.x1 + 60, `shot ${shot} escaped at ${puck.x},${puck.y}`);
  }
}
ok(true, "600 top-speed shots stayed on the table");

// 5. Goal mouths and posts.
{
  const puck = { x: 200, y: TABLE.centerY, vx: -900, vy: 0 };
  let goal = null;
  for (let i = 0; i < 240 && !goal; i += 1) goal = stepPuck(puck, [], STEP).goal;
  ok(goal === "left", "a shot into the left mouth is a goal for the player");
  const high = { x: 200, y: GOAL_TOP - 20, vx: -900, vy: 0 };
  goal = null;
  for (let i = 0; i < 120 && !goal; i += 1) goal = stepPuck(high, [], STEP).goal;
  ok(goal === null && high.vx > 0, "a shot beside the mouth bounces off the end wall");
  const post = { x: TABLE.x1 - 40, y: GOAL_BOTTOM + 6, vx: 900, vy: 0 };
  for (let i = 0; i < 40; i += 1) stepPuck(post, [], STEP);
  ok(post.vx < 0 && post.x < TABLE.x1, "a shot onto the post corner bounces back");
  const inGoal = { x: TABLE.x1 + 2, y: GOAL_BOTTOM - 5, vx: 50, vy: 800 };
  goal = null;
  for (let i = 0; i < 240 && !goal; i += 1) goal = stepPuck(inGoal, [], STEP).goal;
  ok(goal === "right" && inGoal.y <= GOAL_BOTTOM - PUCK.radius + 1e-6, "a puck inside the goal stays between the goal walls");
}

// 6. A mallet pinning the puck against a wall squeezes it out, never through.
{
  const puck = { x: 700, y: TABLE.y0 + PUCK.radius + 2, vx: 0, vy: 0 };
  let m = { x: 703, y: TABLE.y0 + 80 };
  for (let i = 0; i < 120; i += 1) {
    const to = clampMallet("right", m.x, m.y - 4);
    stepPuck(puck, [{ from: m, to }], STEP);
    m = to;
    assert.ok(inside(puck), "pinned puck stays on the table");
  }
  ok(Math.hypot(puck.x - m.x, puck.y - m.y) >= CONTACT - 0.6, "pinned puck does not overlap the mallet");
}

// 7. Mallet bounds: 16 extreme targets for each side.
for (const x of [-10000, 0, TABLE.centerX, 10000]) {
  for (const y of [-10000, 0, TABLE.centerY, 10000]) {
    const p = clampMallet("right", x, y);
    const c = clampMallet("left", x, y);
    assert.ok(p.x >= TABLE.centerX + PADDLE.radius && p.x <= TABLE.x1 - PADDLE.radius && p.y >= TABLE.y0 + PADDLE.radius && p.y <= TABLE.y1 - PADDLE.radius);
    assert.ok(c.x >= TABLE.x0 + PADDLE.radius && c.x <= TABLE.centerX - PADDLE.radius && c.y >= TABLE.y0 + PADDLE.radius && c.y <= TABLE.y1 - PADDLE.radius);
  }
}
ok(true, "32 mallet bound checks");

// 8. AI prediction unfolds wall bounces.
ok(Math.abs(ai.predictY({ x: 480, y: 285, vx: -400, vy: 0 }, 100) - 285) < 1e-9, "straight shot predicts straight");
{
  const p = { x: 480, y: 285, vx: -400, vy: -800 };
  const lo = TABLE.y0 + PUCK.radius;
  const y = ai.predictY(p, 100);
  ok(y >= lo && y <= TABLE.y1 - PUCK.radius, "banked prediction stays on the table");
}

// 9. Rules: scoring to 7, serving after a goal, one match-over event.
{
  const world = sim.createWorld(3);
  const events = [];
  for (let goal = 1; goal <= MATCH.winScore; goal += 1) {
    world.run.status = "playing";
    Object.assign(world.puck, { x: TABLE.x0 + 5, y: TABLE.centerY, vx: -900, vy: 0 });
    for (let i = 0; i < 30 && world.run.playerScore < goal; i += 1) events.push(...sim.stepWorld(world, null, SIM.stepMs));
    assert.equal(world.run.playerScore, goal);
    assert.equal(world.run.status, goal === MATCH.winScore ? "complete" : "serving");
    if (goal < MATCH.winScore) ok(world.puck.x < TABLE.centerX && world.puck.vx === 0, "the side that conceded gets the puck");
  }
  assert.equal(world.run.winner, "player");
  for (let t = 0; t < MATCH.endDelayMs + 500; t += SIM.stepMs) events.push(...sim.stepWorld(world, null, SIM.stepMs));
  ok(world.run.playerScore === 7, "no goals count after the match is decided");
  ok(events.filter((e) => e.type === "match-over").length === 1, "exactly one match-over event");
  ok(events.filter((e) => e.type === "goal").length === 7, "seven goal events");
}

// 10. Possession rule: a parked puck passes to the other side after 7 s.
{
  const world = sim.createWorld(5);
  world.run.status = "playing";
  Object.assign(world.puck, { x: 700, y: 120, vx: 0, vy: 0 });
  let handover = null;
  for (let t = 0; t < sim.POSSESSION_LIMIT_MS + 100 && !handover; t += SIM.stepMs) {
    handover = sim.stepWorld(world, { x: 860, y: 450 }, SIM.stepMs).find((e) => e.type === "handover") ?? null;
  }
  ok(handover?.to === "ai" && world.run.status === "serving" && world.puck.x < TABLE.centerX, "a parked puck passes to the AI");
}

// 11. Whole seeded matches, scripted bot against the AI: each finishes at 7,
// the puck never leaves the table, the AI attacks and scores, and it can lose.
const results = [];
for (const s of [1, 2, 3, 4, 5, 6]) {
  for (const level of [{ botSpeed: 700, botReactMs: 160 }, { botSpeed: 1000, botReactMs: 100 }]) {
    const m = playHeadlessMatch(s, level);
    assert.ok(m.winner, `seed ${s} finished`);
    assert.equal(Math.max(m.run.playerScore, m.run.aiScore), 7);
    assert.equal(m.outside, 0, `seed ${s}: puck stayed on the table`);
    assert.ok(m.maxSpeed <= PUCK.maxSpeed + 1e-6);
    results.push(m);
  }
}
ok(results.every((m) => m.malletHits.ai > 10), "the AI strikes the puck in every match");
ok(results.filter((m) => m.run.aiScore > 0).length >= results.length - 1, "the AI scores in nearly every match");
ok(results.some((m) => m.winner === "player") && results.some((m) => m.winner === "ai"), "the AI wins some and loses some");
ok(results.every((m) => m.simSeconds < 600), "matches finish within 10 minutes of play");

console.log(`${checks} physics, rules and AI checks passed; headless matches: ${results.map((m) => `${m.run.playerScore}-${m.run.aiScore}`).join(" ")}`);
