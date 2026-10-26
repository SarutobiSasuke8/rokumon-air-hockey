// Computer opponent with no Phaser imports. It defends the left goal and
// attacks the right one. It re-reads the puck every AI.reactionMs, moves at a
// capped speed and aims with a seeded random error, so it is beatable but
// still comes forward to strike.
import { TABLE, PUCK, PADDLE, AI } from "./constants.js";
import { GOAL_BOTTOM, GOAL_TOP, type Puck, type Vec, clampMallet } from "./physics.js";

/** Small seeded PRNG (mulberry32) so seeded runs repeat exactly. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AiBrain {
  target: Vec;
  sinceReadMs: number;
  aimY: number;
  rng: () => number;
}

export function createAi(rng: () => number): AiBrain {
  return { target: { x: TABLE.x0 + AI.defenceInset, y: TABLE.centerY }, sinceReadMs: AI.reactionMs, aimY: TABLE.centerY, rng };
}

/** Puck y when it reaches x, unfolding bounces off the top and bottom walls. */
export function predictY(puck: Puck, x: number): number {
  if (Math.abs(puck.vx) < 1e-6) return puck.y;
  const t = (x - puck.x) / puck.vx;
  if (t < 0) return puck.y;
  const lo = TABLE.y0 + PUCK.radius;
  const span = TABLE.y1 - PUCK.radius - lo;
  let y = (puck.y + puck.vy * t - lo) % (2 * span);
  if (y < 0) y += 2 * span;
  return lo + (y > span ? 2 * span - y : y);
}

/**
 * Aim point y beyond the player's goal line: straight at the goal, or at the
 * goal's mirror image across the top or bottom wall for a bank shot.
 */
export function pickAim(rng: () => number): number {
  const goalY = TABLE.centerY + (rng() * 2 - 1) * AI.aimErrorPx;
  const roll = rng();
  const top = TABLE.y0 + PUCK.radius;
  const bottom = TABLE.y1 - PUCK.radius;
  if (roll < 0.4) return goalY;
  return roll < 0.7 ? 2 * top - goalY : 2 * bottom - goalY;
}

/** Pick where the AI mallet wants to be, given a fresh read of the puck. */
export function chooseTarget(brain: AiBrain, puck: Puck, mallet: Vec, serving: boolean): Vec {
  const contact = PUCK.radius + PADDLE.radius;
  const guardX = TABLE.x0 + AI.defenceInset;
  const onOurSide = puck.x < TABLE.centerX;
  const speed = Math.hypot(puck.vx, puck.vy);
  const guardY = (y: number) => Math.min(Math.max(y, GOAL_TOP + 10), GOAL_BOTTOM - 10);

  if (serving && !onOurSide) return clampMallet("left", guardX, TABLE.centerY);

  if (onOurSide && puck.x > mallet.x - 4 && (speed < AI.strikeSpeed || puck.vx > 0)) {
    // Attack: line up behind the puck on the line to the aim point, then drive through it.
    const aimX = TABLE.x1 + 40;
    const dx = aimX - puck.x;
    const dy = brain.aimY - puck.y;
    const d = Math.hypot(dx, dy);
    const ux = dx / d;
    const uy = dy / d;
    const behind = { x: puck.x - ux * (contact + 8), y: puck.y - uy * (contact + 8) };
    const lined = Math.hypot(mallet.x - behind.x, mallet.y - behind.y) < 14;
    const t = lined ? { x: puck.x + ux * 60, y: puck.y + uy * 60 } : behind;
    return clampMallet("left", t.x, t.y);
  }

  if (onOurSide && puck.x <= mallet.x - 4) {
    // The puck slipped behind: go round it rather than knocking it in.
    const side = mallet.y < puck.y ? -1 : 1;
    return clampMallet("left", puck.x - contact - 6, puck.y + side * contact * 1.1);
  }

  // Defend: sit on the guard line where the puck will arrive, and step into
  // it toward the aim point as it gets close so blocks become returns.
  if (puck.vx < -20) {
    const y = guardY(predictY(puck, guardX));
    if (puck.x - mallet.x < 140) {
      const dx = TABLE.x1 - guardX;
      const dy = brain.aimY - y;
      const d = Math.hypot(dx, dy);
      return clampMallet("left", guardX + (dx / d) * 40, y + (dy / d) * 40);
    }
    return clampMallet("left", guardX, y);
  }
  return clampMallet("left", guardX, guardY(TABLE.centerY + (puck.y - TABLE.centerY) * 0.5));
}

/** Advance the AI by dtMs. Returns where its mallet moves to this step. */
export function stepAi(brain: AiBrain, puck: Puck, mallet: Vec, dtMs: number, serving: boolean): Vec {
  brain.sinceReadMs += dtMs;
  if (brain.sinceReadMs >= AI.reactionMs) {
    brain.sinceReadMs = 0;
    if (puck.x >= TABLE.centerX || Math.hypot(puck.vx, puck.vy) > AI.strikeSpeed) brain.aimY = pickAim(brain.rng);
    brain.target = chooseTarget(brain, puck, mallet, serving);
  }
  const maxStep = (AI.maxSpeed * dtMs) / 1000;
  const dx = brain.target.x - mallet.x;
  const dy = brain.target.y - mallet.y;
  const d = Math.hypot(dx, dy);
  const next = d <= maxStep ? brain.target : { x: mallet.x + (dx / d) * maxStep, y: mallet.y + (dy / d) * maxStep };
  return clampMallet("left", next.x, next.y);
}
