// Play one seeded match in Node: the scripted bot (scripts/lib/bot.mjs)
// against the shipped AI, through the shipped simulation.
import { loadTs } from "./load-ts.mjs";
import { botTarget } from "./bot.mjs";

const sim = loadTs("src/game/sim.ts");
const physics = loadTs("src/game/physics.ts");
const { SIM } = loadTs("src/game/constants.ts");

export function playHeadlessMatch(seed, { botSpeed = 1400, botReactMs = 60, maxMs = 15 * 60 * 1000 } = {}) {
  const world = sim.createWorld(seed);
  let cursor = { ...world.player }, target = cursor, sinceRead = Infinity, phase = seed;
  const counts = { goals: [], handovers: 0, malletHits: { player: 0, ai: 0 }, maxSpeed: 0, outside: 0 };
  let t = 0, over = null;
  while (!over && t < maxMs) {
    t += SIM.stepMs;
    sinceRead += SIM.stepMs;
    if (sinceRead >= botReactMs) { sinceRead = 0; phase += 0.7; target = botTarget(world.puck, world.player, phase); }
    cursor = physics.approach(cursor, target, (botSpeed * SIM.stepMs) / 1000);
    for (const e of sim.stepWorld(world, cursor, SIM.stepMs)) {
      if (e.type === "goal") counts.goals.push(e.scorer);
      if (e.type === "handover") counts.handovers += 1;
      if (e.type === "mallet") counts.malletHits[e.by] += 1;
      if (e.type === "match-over") over = e.winner;
    }
    const p = world.puck;
    counts.maxSpeed = Math.max(counts.maxSpeed, Math.hypot(p.vx, p.vy));
    if (!(Number.isFinite(p.x) && Number.isFinite(p.y))) throw new Error(`seed ${seed}: puck position is not finite`);
    if (p.y < 70 - 1 || p.y > 500 + 1 || p.x < 40 - 60 || p.x > 920 + 60) counts.outside += 1;
  }
  return { seed, winner: over, run: world.run, simSeconds: Math.round(t / 1000), ...counts };
}
