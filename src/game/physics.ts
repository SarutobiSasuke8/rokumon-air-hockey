// Puck physics with no Phaser imports, so it runs in Node tests as-is.
//
// Mallets are kinematic: each step says where a mallet started and where it
// ended. The step is split into substeps so neither the puck nor a mallet
// moves more than half a puck radius per substep, and every mallet contact is
// solved as a swept circle test in the mallet's frame. A fast puck or a fast
// swing therefore cannot pass through a mallet or a wall.
import { TABLE, GOAL, PUCK, PADDLE } from "./constants.js";

export interface Vec {
  x: number;
  y: number;
}

export interface Puck extends Vec {
  vx: number;
  vy: number;
}

export interface MalletMove {
  from: Vec;
  to: Vec;
}

export type HitKind = "wall" | "mallet";

export interface StepResult {
  /** "left" when the puck went fully into the left goal (the player scores). */
  goal: "left" | "right" | null;
  hits: { kind: HitKind; speed: number; mallet?: number }[];
}

export const GOAL_TOP = TABLE.centerY - GOAL.halfHeight;
export const GOAL_BOTTOM = TABLE.centerY + GOAL.halfHeight;
const CONTACT = PUCK.radius + PADDLE.radius;
const MAX_SUBSTEPS = 256;

export function speedOf(p: { vx: number; vy: number }): number {
  return Math.hypot(p.vx, p.vy);
}

function capSpeed(p: Puck): void {
  const s = speedOf(p);
  if (s > PUCK.maxSpeed) {
    p.vx *= PUCK.maxSpeed / s;
    p.vy *= PUCK.maxSpeed / s;
  }
}

/**
 * Earliest t in [0, 1] at which a point moving from d0 to d1 (puck centre
 * relative to the mallet centre) reaches distance `radius`, or null.
 * Returns 0 when it already starts inside.
 */
export function sweptContact(d0: Vec, d1: Vec, radius: number): number | null {
  const c = d0.x * d0.x + d0.y * d0.y - radius * radius;
  if (c <= 0) return 0;
  const ex = d1.x - d0.x;
  const ey = d1.y - d0.y;
  const a = ex * ex + ey * ey;
  if (a < 1e-12) return null;
  const b = 2 * (d0.x * ex + d0.y * ey);
  if (b >= 0) return null; // moving apart
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

function hitMallet(puck: Puck, start: Vec, end: Vec, mv: Vec, mStart: Vec, mEnd: Vec): number | null {
  const d0 = { x: start.x - mStart.x, y: start.y - mStart.y };
  const d1 = { x: end.x - mEnd.x, y: end.y - mEnd.y };
  const t = sweptContact(d0, d1, CONTACT);
  if (t === null) return null;
  let nx = d0.x + (d1.x - d0.x) * t;
  let ny = d0.y + (d1.y - d0.y) * t;
  let len = Math.hypot(nx, ny);
  if (len < 1e-6) {
    // Dead centre: push the puck along the mallet's motion, or sideways.
    nx = mv.x || 1;
    ny = mv.y;
    len = Math.hypot(nx, ny);
  }
  nx /= len;
  ny /= len;
  // Keep the puck touching the mallet's end position.
  puck.x = mEnd.x + nx * (CONTACT + 0.01);
  puck.y = mEnd.y + ny * (CONTACT + 0.01);
  const rvn = (puck.vx - mv.x) * nx + (puck.vy - mv.y) * ny;
  if (rvn < 0) {
    puck.vx -= (1 + PADDLE.restitution) * rvn * nx;
    puck.vy -= (1 + PADDLE.restitution) * rvn * ny;
  }
  capSpeed(puck);
  return Math.abs(rvn);
}

/** Walls, the goal mouths and their posts. Returns the impact speed or 0. */
function collideWalls(p: Puck): number {
  const r = PUCK.radius;
  const e = PUCK.wallRestitution;
  let impact = 0;
  const inLeftChannel = p.x < TABLE.x0;
  const inRightChannel = p.x > TABLE.x1;

  if (inLeftChannel || inRightChannel) {
    // Inside a goal: keep it between the goal's side walls.
    if (p.y - r < GOAL_TOP) {
      p.y = GOAL_TOP + r;
      if (p.vy < 0) (impact = -p.vy), (p.vy = -p.vy * e);
    } else if (p.y + r > GOAL_BOTTOM) {
      p.y = GOAL_BOTTOM - r;
      if (p.vy > 0) (impact = p.vy), (p.vy = -p.vy * e);
    }
  } else {
    if (p.y - r < TABLE.y0) {
      p.y = TABLE.y0 + r;
      if (p.vy < 0) (impact = -p.vy), (p.vy = -p.vy * e);
    } else if (p.y + r > TABLE.y1) {
      p.y = TABLE.y1 - r;
      if (p.vy > 0) (impact = p.vy), (p.vy = -p.vy * e);
    }
    const inMouth = p.y > GOAL_TOP && p.y < GOAL_BOTTOM;
    if (!inMouth) {
      if (p.x - r < TABLE.x0) {
        p.x = TABLE.x0 + r;
        if (p.vx < 0) (impact = -p.vx), (p.vx = -p.vx * e);
      } else if (p.x + r > TABLE.x1) {
        p.x = TABLE.x1 - r;
        if (p.vx > 0) (impact = p.vx), (p.vx = -p.vx * e);
      }
    }
  }

  // Goal posts: round corners where the mouth meets the side wall.
  for (const postX of [TABLE.x0, TABLE.x1]) {
    for (const postY of [GOAL_TOP, GOAL_BOTTOM]) {
      const dx = p.x - postX;
      const dy = p.y - postY;
      const d = Math.hypot(dx, dy);
      if (d < r && d > 1e-6) {
        const nx = dx / d;
        const ny = dy / d;
        p.x = postX + nx * r;
        p.y = postY + ny * r;
        const vn = p.vx * nx + p.vy * ny;
        if (vn < 0) {
          impact = Math.max(impact, -vn);
          p.vx -= (1 + e) * vn * nx;
          p.vy -= (1 + e) * vn * ny;
        }
      }
    }
  }
  return impact;
}

/**
 * When a mallet pins the puck against a wall, slide the puck along the wall
 * so the two never overlap (the wall wins, the puck squeezes out sideways).
 */
function unpin(p: Puck, m: Vec): void {
  const dx = p.x - m.x;
  const dy = p.y - m.y;
  if (dx * dx + dy * dy >= (CONTACT - 0.5) ** 2) return;
  const r = PUCK.radius;
  const onTopOrBottom = p.y <= TABLE.y0 + r + 0.01 || p.y >= TABLE.y1 - r - 0.01;
  if (onTopOrBottom) {
    const off = Math.sqrt(Math.max(0, CONTACT * CONTACT - dy * dy)) + 0.01;
    p.x = m.x + (dx >= 0 ? off : -off);
  } else {
    const off = Math.sqrt(Math.max(0, CONTACT * CONTACT - dx * dx)) + 0.01;
    p.y = m.y + (dy >= 0 ? off : -off);
  }
  p.x = Math.min(Math.max(p.x, TABLE.x0 + r), TABLE.x1 - r);
  p.y = Math.min(Math.max(p.y, TABLE.y0 + r), TABLE.y1 - r);
}

/** Advance the puck by dt seconds against the walls and the moving mallets. */
export function stepPuck(puck: Puck, mallets: MalletMove[], dt: number): StepResult {
  const result: StepResult = { goal: null, hits: [] };
  let travel = speedOf(puck) * dt;
  for (const m of mallets) travel = Math.max(travel, Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y));
  const n = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(travel / (PUCK.radius * 0.5))));
  const h = dt / n;
  const velocities = mallets.map((m) => ({ x: (m.to.x - m.from.x) / dt, y: (m.to.y - m.from.y) / dt }));
  const friction = Math.exp(-PUCK.frictionPerSecond * h);
  const at = (m: MalletMove, f: number): Vec => ({ x: m.from.x + (m.to.x - m.from.x) * f, y: m.from.y + (m.to.y - m.from.y) * f });

  for (let i = 0; i < n; i += 1) {
    const start = { x: puck.x, y: puck.y };
    puck.x += puck.vx * h;
    puck.y += puck.vy * h;

    mallets.forEach((m, index) => {
      const mStart = at(m, i / n);
      const mEnd = at(m, (i + 1) / n);
      const impact = hitMallet(puck, start, { x: puck.x, y: puck.y }, velocities[index], mStart, mEnd);
      if (impact !== null && impact > 1) result.hits.push({ kind: "mallet", speed: impact, mallet: index });
    });

    const wallImpact = collideWalls(puck);
    if (wallImpact > 1) result.hits.push({ kind: "wall", speed: wallImpact });
    mallets.forEach((m) => unpin(puck, at(m, (i + 1) / n)));

    puck.vx *= friction;
    puck.vy *= friction;

    if (puck.x + PUCK.radius < TABLE.x0) {
      result.goal = "left";
      return result;
    }
    if (puck.x - PUCK.radius > TABLE.x1) {
      result.goal = "right";
      return result;
    }
  }
  return result;
}

/** Clamp a mallet centre to its own half of the table. */
export function clampMallet(side: "left" | "right", x: number, y: number): Vec {
  const r = PADDLE.radius;
  const minX = side === "left" ? TABLE.x0 + r : TABLE.centerX + r + PADDLE.centreGap;
  const maxX = side === "left" ? TABLE.centerX - r - PADDLE.centreGap : TABLE.x1 - r;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, TABLE.y0 + r), TABLE.y1 - r),
  };
}

/** Move `from` toward `to` by at most `maxStep` pixels. */
export function approach(from: Vec, to: Vec, maxStep: number): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d <= maxStep || d < 1e-9) return { x: to.x, y: to.y };
  return { x: from.x + (dx / d) * maxStep, y: from.y + (dy / d) * maxStep };
}
