// All values that affect player feel live here. Mirror important choices in
// Templates/GAMEPLAY_CONSTANTS.md when they change.

export const TABLE = Object.freeze({
  width: 960,
  height: 540,
  // Playable surface inset from the canvas edge, leaves room for the HUD.
  x0: 40,
  y0: 70,
  x1: 920,
  y1: 500,
  get centerX() {
    return (this.x0 + this.x1) / 2;
  },
  get centerY() {
    return (this.y0 + this.y1) / 2;
  },
});

export const GOAL = Object.freeze({
  // Half-height of the goal mouth cut into the left/right walls.
  halfHeight: 85,
  wallThickness: 12,
  sensorDepth: 26,
});

export const PUCK = Object.freeze({
  radius: 13,
  // Arcade Physics `bounce` on wall collisions. Kept high so rebounds feel
  // lively without perpetually gaining energy (damping handles that).
  wallBounce: 0.94,
  // Per-frame-at-60fps multiplicative damping. Close to 1 so the puck glides
  // (low friction) rather than the sluggish "bouncy ball" feel.
  glideDampingPerFrame: 0.9985,
  maxSpeed: 760,
  // Speed the puck launches at after a serve.
  serveSpeed: 260,
});

export const PADDLE = Object.freeze({
  radius: 27,
  // Fraction of the striking paddle's own velocity blended into the puck's
  // post-collision velocity, on top of the physics bounce. This is what
  // makes a fast paddle swing feel like it "hits" rather than just deflects.
  hitTransfer: 0.85,
  minHitSpeed: 180,
});

export const AI = Object.freeze({
  maxSpeed: 300, // px/s the AI paddle may move. Kept beatable.
  reactionDelayMs: 160, // how stale the AI's read of the puck is.
  homeXInset: 150, // distance from the AI's back wall for its home position.
  advanceXLimit: 40, // how close to the center line the AI will push up.
});

export const MATCH = Object.freeze({
  winScore: 7,
  serveDelayMs: 1100,
  goalFreezeMs: 250,
});
