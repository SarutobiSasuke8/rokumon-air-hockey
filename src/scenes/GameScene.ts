import Phaser from "phaser";
import { TABLE, GOAL, PUCK, PADDLE, AI, MATCH } from "../game/constants.js";
import { createRunState, snapshotRun, type RunState } from "../game/state.js";
import { createPlayerActions, type PlayerActions } from "../systems/input.js";
import { installDebug } from "../systems/debug.js";
import { hub } from "../integrations/hub.js";
import { sfx } from "../systems/audio.js";

type Circle = Phaser.Physics.Arcade.Image;

const GOAL_TOP = TABLE.centerY - GOAL.halfHeight;
const GOAL_BOTTOM = TABLE.centerY + GOAL.halfHeight;

export class GameScene extends Phaser.Scene {
  private state!: RunState;
  private actions!: PlayerActions;

  private puck!: Circle;
  private playerPaddle!: Circle;
  private aiPaddle!: Circle;

  private aiTarget = { x: 0, y: TABLE.centerY };
  private aiSampleAccumMs = 0;

  private prevPlayer = { x: 0, y: 0 };
  private prevAi = { x: 0, y: 0 };

  private serveTimer = 0;
  private goalFlash!: Phaser.GameObjects.Rectangle;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super("Game");
  }

  create(): void {
    this.state = createRunState(this.registry.get("seed") ?? 1);

    this.buildTable();
    this.buildWalls();
    this.buildGoalSensors();
    this.buildPaddlesAndPuck();

    this.actions = createPlayerActions(this);

    this.aiTarget = { x: this.aiHomeX(), y: TABLE.centerY };
    this.prevPlayer = { x: this.playerPaddle.x, y: this.playerPaddle.y };
    this.prevAi = { x: this.aiPaddle.x, y: this.aiPaddle.y };

    this.goalFlash = this.add
      .rectangle(TABLE.centerX, TABLE.centerY, TABLE.width, TABLE.height, 0xffffff, 0)
      .setDepth(50);

    this.particles = this.add.particles(0, 0, "tex-particle", {
      speed: { min: 80, max: 260 },
      lifespan: 420,
      scale: { start: 1, end: 0 },
      quantity: 0,
      emitting: false,
    });
    this.particles.setDepth(40);

    this.scene.launch("UI");
    this.game.events.emit("score-changed", { player: 0, ai: 0 });

    hub.ready();
    installDebug(this, () => snapshotRun(this.state));

    this.queueServe(MATCH.serveDelayMs, this.serveDirectionForKickoff());
  }

  update(_time: number, delta: number): void {
    if (this.actions.restartPressed()) {
      this.scene.stop("UI");
      this.scene.start("Game");
      return;
    }

    this.updatePlayerPaddle(delta);
    this.updateAiPaddle(delta);

    if (this.state.status === "serving") {
      this.serveTimer -= delta;
      if (this.serveTimer <= 0) this.launchServe();
      return;
    }

    if (this.state.status !== "playing") return;

    this.state.elapsedMs += delta;
    this.applyPuckGlide(delta);
  }

  // --- Construction -------------------------------------------------------

  private buildTable(): void {
    this.cameras.main.setBackgroundColor("#0b1020");
    const g = this.add.graphics().setDepth(0);

    // Rink surface.
    g.fillStyle(0x0f1b33, 1);
    g.fillRect(TABLE.x0, TABLE.y0, TABLE.x1 - TABLE.x0, TABLE.y1 - TABLE.y0);

    // Center line + circle.
    g.lineStyle(2, 0x334155, 1);
    g.beginPath();
    g.moveTo(TABLE.centerX, TABLE.y0);
    g.lineTo(TABLE.centerX, TABLE.y1);
    g.strokePath();
    g.strokeCircle(TABLE.centerX, TABLE.centerY, 60);

    // Outer boundary.
    g.lineStyle(3, 0x475569, 1);
    g.strokeRect(TABLE.x0, TABLE.y0, TABLE.x1 - TABLE.x0, TABLE.y1 - TABLE.y0);

    // Goal mouth markers.
    g.lineStyle(4, 0xfbbf24, 1);
    g.beginPath();
    g.moveTo(TABLE.x0, GOAL_TOP);
    g.lineTo(TABLE.x0, GOAL_BOTTOM);
    g.strokePath();
    g.beginPath();
    g.moveTo(TABLE.x1, GOAL_TOP);
    g.lineTo(TABLE.x1, GOAL_BOTTOM);
    g.strokePath();
  }

  private buildWalls(): void {
    const walls = this.physics.add.staticGroup();
    const t = GOAL.wallThickness;

    const addWall = (cx: number, cy: number, w: number, h: number) => {
      const wall = this.add.rectangle(cx, cy, w, h, 0x1e293b, 0);
      this.physics.add.existing(wall, true);
      walls.add(wall);
    };

    // Top / bottom walls (full length).
    addWall(TABLE.centerX, TABLE.y0 - t / 2, TABLE.x1 - TABLE.x0 + t * 2, t);
    addWall(TABLE.centerX, TABLE.y1 + t / 2, TABLE.x1 - TABLE.x0 + t * 2, t);

    // Left wall, split above/below the goal gap.
    addWall(TABLE.x0 - t / 2, (TABLE.y0 + GOAL_TOP) / 2, t, GOAL_TOP - TABLE.y0);
    addWall(TABLE.x0 - t / 2, (GOAL_BOTTOM + TABLE.y1) / 2, t, TABLE.y1 - GOAL_BOTTOM);

    // Right wall, split above/below the goal gap.
    addWall(TABLE.x1 + t / 2, (TABLE.y0 + GOAL_TOP) / 2, t, GOAL_TOP - TABLE.y0);
    addWall(TABLE.x1 + t / 2, (GOAL_BOTTOM + TABLE.y1) / 2, t, TABLE.y1 - GOAL_BOTTOM);

    this.wallsGroup = walls;
  }

  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;

  private buildGoalSensors(): void {
    const depth = GOAL.sensorDepth;
    this.leftGoalZone = this.add.zone(TABLE.x0 - depth / 2, TABLE.centerY, depth, GOAL.halfHeight * 2);
    this.rightGoalZone = this.add.zone(TABLE.x1 + depth / 2, TABLE.centerY, depth, GOAL.halfHeight * 2);
    this.physics.add.existing(this.leftGoalZone, true);
    this.physics.add.existing(this.rightGoalZone, true);
  }

  private leftGoalZone!: Phaser.GameObjects.Zone;
  private rightGoalZone!: Phaser.GameObjects.Zone;

  private buildPaddlesAndPuck(): void {
    this.puck = this.physics.add.image(TABLE.centerX, TABLE.centerY, "tex-puck");
    this.puck.setCircle(PUCK.radius);
    this.puck.setBounce(PUCK.wallBounce);
    this.puck.setCollideWorldBounds(false);
    this.puck.setDamping(false);
    this.puck.setMaxVelocity(PUCK.maxSpeed);

    this.physics.add.collider(this.puck, this.wallsGroup, () => sfx.wallHit());

    this.playerPaddle = this.physics.add.image(TABLE.x1 - 150, TABLE.centerY, "tex-paddle-player");
    this.playerPaddle.setCircle(PADDLE.radius);
    this.playerPaddle.setImmovable(true);
    (this.playerPaddle.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.aiPaddle = this.physics.add.image(this.aiHomeX(), TABLE.centerY, "tex-paddle-ai");
    this.aiPaddle.setCircle(PADDLE.radius);
    this.aiPaddle.setImmovable(true);
    (this.aiPaddle.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.physics.add.collider(this.puck, this.playerPaddle, (puckObj, paddleObj) =>
      this.onPaddleHit(puckObj as Circle, paddleObj as Circle, this.prevPlayer),
    );
    this.physics.add.collider(this.puck, this.aiPaddle, (puckObj, paddleObj) =>
      this.onPaddleHit(puckObj as Circle, paddleObj as Circle, this.prevAi),
    );

    this.physics.add.overlap(this.puck, this.leftGoalZone, () => this.onGoal("player"));
    this.physics.add.overlap(this.puck, this.rightGoalZone, () => this.onGoal("ai"));
  }

  private aiHomeX(): number {
    return TABLE.x0 + AI.homeXInset;
  }

  // --- Per-frame updates ---------------------------------------------------

  private updatePlayerPaddle(delta: number): void {
    this.prevPlayer = { x: this.playerPaddle.x, y: this.playerPaddle.y };

    const kb = this.actions.keyboardVector();
    const pointer = this.actions.pointerTarget();

    let targetX = this.playerPaddle.x;
    let targetY = this.playerPaddle.y;

    if (pointer) {
      targetX = pointer.x;
      targetY = pointer.y;
    } else if (kb.x !== 0 || kb.y !== 0) {
      const kbSpeed = 420 * (delta / 1000);
      targetX += kb.x * kbSpeed;
      targetY += kb.y * kbSpeed;
    }

    const r = PADDLE.radius;
    const clampedX = Phaser.Math.Clamp(targetX, TABLE.centerX + r + 4, TABLE.x1 - r);
    const clampedY = Phaser.Math.Clamp(targetY, TABLE.y0 + r, TABLE.y1 - r);

    this.playerPaddle.setPosition(clampedX, clampedY);
    this.playerPaddle.body!.updateFromGameObject();
  }

  private updateAiPaddle(delta: number): void {
    this.prevAi = { x: this.aiPaddle.x, y: this.aiPaddle.y };

    this.aiSampleAccumMs += delta;
    if (this.aiSampleAccumMs >= AI.reactionDelayMs) {
      this.aiSampleAccumMs = 0;
      if (this.puck.x < TABLE.centerX && this.state.status === "playing") {
        this.aiTarget = {
          x: Phaser.Math.Clamp(this.puck.x, TABLE.x0 + PADDLE.radius, TABLE.centerX - AI.advanceXLimit),
          y: this.puck.y,
        };
      } else {
        this.aiTarget = { x: this.aiHomeX(), y: TABLE.centerY };
      }
    }

    const r = PADDLE.radius;
    const maxStep = (AI.maxSpeed * delta) / 1000;
    const dx = Phaser.Math.Clamp(this.aiTarget.x - this.aiPaddle.x, -maxStep, maxStep);
    const dy = Phaser.Math.Clamp(this.aiTarget.y - this.aiPaddle.y, -maxStep, maxStep);

    const nextX = Phaser.Math.Clamp(this.aiPaddle.x + dx, TABLE.x0 + r, TABLE.centerX - r - 4);
    const nextY = Phaser.Math.Clamp(this.aiPaddle.y + dy, TABLE.y0 + r, TABLE.y1 - r);

    this.aiPaddle.setPosition(nextX, nextY);
    this.aiPaddle.body!.updateFromGameObject();
  }

  private applyPuckGlide(delta: number): void {
    const damping = Math.pow(PUCK.glideDampingPerFrame, delta / 16.667);
    const body = this.puck.body as Phaser.Physics.Arcade.Body;
    this.puck.setVelocity(body.velocity.x * damping, body.velocity.y * damping);
  }

  private onPaddleHit(puck: Circle, paddle: Circle, prev: { x: number; y: number }): void {
    const dtGuess = 1 / 60;
    const paddleVx = (paddle.x - prev.x) / dtGuess;
    const paddleVy = (paddle.y - prev.y) / dtGuess;
    const paddleSpeed = Math.hypot(paddleVx, paddleVy);
    const body = puck.body as Phaser.Physics.Arcade.Body;

    puck.setVelocity(
      body.velocity.x + paddleVx * PADDLE.hitTransfer,
      body.velocity.y + paddleVy * PADDLE.hitTransfer,
    );

    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed > PUCK.maxSpeed) {
      const scale = PUCK.maxSpeed / speed;
      puck.setVelocity(body.velocity.x * scale, body.velocity.y * scale);
    }

    sfx.paddleHit(Math.max(paddleSpeed, PADDLE.minHitSpeed));
  }

  // --- Scoring --------------------------------------------------------------

  private onGoal(scorer: "player" | "ai"): void {
    if (this.state.status !== "playing") return;
    this.state.status = "goal";

    if (scorer === "player") this.state.playerScore += 1;
    else this.state.aiScore += 1;

    this.game.events.emit("score-changed", { player: this.state.playerScore, ai: this.state.aiScore });
    hub.score(this.state.playerScore);

    this.juiceGoal(scorer);

    const win = this.state.playerScore >= MATCH.winScore;
    const lose = this.state.aiScore >= MATCH.winScore;

    if (win || lose) {
      this.state.status = "complete";
      this.state.winner = win ? "player" : "ai";
      hub.gameOver(this.state.playerScore, this.state.elapsedMs);
      if (win) hub.event("match-won", { playerScore: this.state.playerScore, opponentScore: this.state.aiScore, seconds: Math.round(this.state.elapsedMs / 1000) });
      sfx.matchEnd(win);
      this.time.delayedCall(MATCH.serveDelayMs, () => {
        this.scene.stop("UI");
        this.scene.start("GameOver", {
          playerScore: this.state.playerScore,
          aiScore: this.state.aiScore,
          won: win,
        });
      });
      return;
    }

    this.puck.setVelocity(0, 0);
    this.puck.setPosition(TABLE.centerX, TABLE.centerY);
    this.queueServe(MATCH.serveDelayMs, scorer === "player" ? -1 : 1);
  }

  private juiceGoal(scorer: "player" | "ai"): void {
    sfx.goal();
    this.cameras.main.shake(180, 0.008);
    this.goalFlash.setFillStyle(scorer === "player" ? 0x22d3ee : 0xfb7185, 0.35);
    this.tweens.add({ targets: this.goalFlash, alpha: 0, duration: 260, onComplete: () => this.goalFlash.setAlpha(0.35).setFillStyle(0xffffff, 0) });

    const burstX = scorer === "player" ? TABLE.x0 : TABLE.x1;
    this.particles.emitParticleAt(burstX, TABLE.centerY, 24);
  }

  // --- Serve flow -------------------------------------------------------

  private queueServe(delayMs: number, directionHint: 1 | -1): void {
    this.state.status = "serving";
    this.serveTimer = delayMs;
    this.pendingServeDirection = directionHint;
    this.puck.setVelocity(0, 0);
    this.puck.setPosition(TABLE.centerX, TABLE.centerY);
  }

  private pendingServeDirection: 1 | -1 = 1;

  private serveDirectionForKickoff(): 1 | -1 {
    return Math.random() < 0.5 ? 1 : -1;
  }

  private launchServe(): void {
    this.state.status = "playing";
    const angle = Phaser.Math.FloatBetween(-0.5, 0.5);
    const vx = Math.cos(angle) * PUCK.serveSpeed * this.pendingServeDirection;
    const vy = Math.sin(angle) * PUCK.serveSpeed;
    this.puck.setVelocity(vx, vy);
    sfx.serve();
  }
}
