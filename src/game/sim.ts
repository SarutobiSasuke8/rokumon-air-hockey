// One match of air hockey as plain data, with no Phaser imports. GameScene
// feeds it the player's target point each fixed step and renders the result;
// the Node tests drive it directly to play whole seeded matches.
import { TABLE, PUCK, PADDLE, MATCH } from "./constants.js";
import { createRunState, type RunState } from "./state.js";
import { approach, clampMallet, stepPuck, type Puck, type Vec } from "./physics.js";
import { createAi, createRng, stepAi, type AiBrain } from "./ai.js";

/** If the puck stays in one half this long, it passes to the other side. */
export const POSSESSION_LIMIT_MS = 7000;

export type Side = "player" | "ai";

export type SimEvent =
  | { type: "wall"; speed: number }
  | { type: "mallet"; speed: number; by: Side }
  | { type: "serve" }
  | { type: "goal"; scorer: Side }
  | { type: "handover"; to: Side }
  | { type: "match-over"; winner: Side };

export interface World {
  run: RunState;
  puck: Puck;
  player: Vec;
  ai: Vec;
  brain: AiBrain;
  timerMs: number;
  sideMs: number;
  matchOverSent: boolean;
}

export const PLAYER_HOME = Object.freeze({ x: TABLE.x1 - 70, y: TABLE.centerY });
export const AI_HOME = Object.freeze({ x: TABLE.x0 + 70, y: TABLE.centerY });

export function serveSpot(side: Side): Vec {
  return { x: TABLE.centerX + (side === "player" ? 1 : -1) * PUCK.serveOffsetX, y: TABLE.centerY };
}

export function createWorld(seed = 1): World {
  const rng = createRng(seed);
  const first: Side = rng() < 0.5 ? "player" : "ai";
  const world: World = {
    run: createRunState(seed),
    puck: { ...serveSpot(first), vx: 0, vy: 0 },
    player: { ...PLAYER_HOME },
    ai: { ...AI_HOME },
    brain: createAi(rng),
    timerMs: MATCH.serveDelayMs,
    sideMs: 0,
    matchOverSent: false,
  };
  return world;
}

function queueServe(world: World, side: Side): void {
  world.run.status = "serving";
  world.timerMs = MATCH.serveDelayMs;
  world.sideMs = 0;
  Object.assign(world.puck, serveSpot(side), { vx: 0, vy: 0 });
}

/**
 * Advance the match by dtMs. `playerTarget` is where the player wants the
 * mallet (pointer or keyboard), or null to leave it where it is.
 */
export function stepWorld(world: World, playerTarget: Vec | null, dtMs: number): SimEvent[] {
  const events: SimEvent[] = [];
  const run = world.run;
  const dt = dtMs / 1000;

  if (run.status === "complete") {
    world.timerMs -= dtMs;
    if (world.timerMs <= 0 && !world.matchOverSent) {
      world.matchOverSent = true;
      events.push({ type: "match-over", winner: run.winner as Side });
    }
    return events;
  }

  const serving = run.status === "serving";
  const want = playerTarget ? clampMallet("right", playerTarget.x, playerTarget.y) : world.player;
  const playerTo = clampMallet("right", ...xy(approach(world.player, want, PADDLE.playerMaxSpeed * dt)));
  const aiTo = stepAi(world.brain, world.puck, world.ai, dtMs, serving);

  if (serving) {
    world.player = playerTo;
    world.ai = aiTo;
    world.timerMs -= dtMs;
    if (world.timerMs <= 0) {
      run.status = "playing";
      events.push({ type: "serve" });
    }
    return events;
  }

  run.elapsedMs += dtMs;
  const result = stepPuck(world.puck, [{ from: world.player, to: playerTo }, { from: world.ai, to: aiTo }], dt);
  world.player = playerTo;
  world.ai = aiTo;
  for (const hit of result.hits) {
    if (hit.kind === "wall") events.push({ type: "wall", speed: hit.speed });
    else events.push({ type: "mallet", speed: hit.speed, by: hit.mallet === 0 ? "player" : "ai" });
  }

  if (result.goal) {
    const scorer: Side = result.goal === "left" ? "player" : "ai";
    if (scorer === "player") run.playerScore += 1;
    else run.aiScore += 1;
    events.push({ type: "goal", scorer });
    if (run.playerScore >= MATCH.winScore || run.aiScore >= MATCH.winScore) {
      run.status = "complete";
      run.winner = scorer;
      world.timerMs = MATCH.endDelayMs;
      world.puck.vx = 0;
      world.puck.vy = 0;
    } else {
      // Whoever conceded gets the puck.
      queueServe(world, scorer === "player" ? "ai" : "player");
    }
    return events;
  }

  // Possession rule: a puck parked in one half passes to the other side.
  const side: Side = world.puck.x >= TABLE.centerX ? "player" : "ai";
  const prevSide = world.sideMs >= 0 ? "player" : "ai";
  if (side !== prevSide) world.sideMs = 0;
  world.sideMs += side === "player" ? dtMs : -dtMs;
  if (Math.abs(world.sideMs) >= POSSESSION_LIMIT_MS) {
    const to: Side = side === "player" ? "ai" : "player";
    queueServe(world, to);
    events.push({ type: "handover", to });
  }
  return events;
}

function xy(v: Vec): [number, number] {
  return [v.x, v.y];
}
