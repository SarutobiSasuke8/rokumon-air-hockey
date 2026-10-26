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
  halfHeight: 100,
});

export const PUCK = Object.freeze({
  radius: 13,
  // Share of normal speed kept when the puck bounces off a wall or post.
  wallRestitution: 0.9,
  // Exponential glide friction per second. Low, so the puck glides.
  frictionPerSecond: 0.32,
  maxSpeed: 1100,
  // Where a served puck waits, measured from the centre line on the side of
  // whoever conceded (or a random side at kick-off).
  serveOffsetX: 150,
});

export const PADDLE = Object.freeze({
  radius: 27,
  // Share of the closing speed returned when the puck meets a mallet.
  restitution: 0.85,
  // The player's mallet chases the pointer at up to this speed, so a fast
  // flick is spread across physics steps instead of teleporting.
  playerMaxSpeed: 3200,
  keyboardSpeed: 520,
  // Gap kept between a mallet and the centre line.
  centreGap: 4,
});

export const AI = Object.freeze({
  maxSpeed: 680, // px/s the AI mallet may move. Kept beatable.
  reactionMs: 120, // how often the AI re-reads the puck.
  aimErrorPx: 70, // random spread on where it aims inside the player's goal.
  defenceInset: 46, // distance from its own goal line it guards from.
  strikeSpeed: 560, // puck speed below which the AI goes on the attack.
});

export const MATCH = Object.freeze({
  winScore: 7,
  serveDelayMs: 900,
  endDelayMs: 1400,
});

export const SIM = Object.freeze({
  // Fixed physics rate. Each step is further split so the puck and the
  // mallets never move more than half a puck radius at a time.
  stepHz: 240,
  get stepMs() {
    return 1000 / this.stepHz;
  },
});
