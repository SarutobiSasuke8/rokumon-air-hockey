import Phaser from "phaser";
import { TABLE, PADDLE, SIM } from "../game/constants.js";
import { GOAL_BOTTOM, GOAL_TOP, type Vec } from "../game/physics.js";
import { createWorld, stepWorld, type SimEvent, type Side, type World } from "../game/sim.js";
import type { RunState } from "../game/state.js";
import { createPlayerActions, type PlayerActions } from "../systems/input.js";
import { testOptions } from "../systems/debug.js";
import { hub } from "../integrations/hub.js";
import { sfx } from "../systems/audio.js";

/**
 * Renders and drives one match. The rules and physics live in src/game/sim.ts
 * (fixed 240 Hz steps, swept collisions); this scene feeds it input, plays
 * sound and effects, reports to the Rokumon SDK and draws the result.
 */
export class GameScene extends Phaser.Scene {
  world!: World;
  private actions!: PlayerActions;
  private accMs = 0;
  private keyTarget: Vec | null = null;

  private puckImg!: Phaser.GameObjects.Image;
  private playerImg!: Phaser.GameObjects.Image;
  private aiImg!: Phaser.GameObjects.Image;
  private goalFlash!: Phaser.GameObjects.Rectangle;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastWallSoundMs = 0;

  constructor() {
    super("Game");
  }

  /** Match state, read by the HUD, the pause overlay and the test hooks. */
  get state(): RunState {
    return this.world.run;
  }

  create(): void {
    const seed = testOptions.seed ?? this.registry.get("seed") ?? Math.floor(Math.random() * 2 ** 31);
    this.world = createWorld(seed);
    this.accMs = 0;
    this.keyTarget = null;

    this.buildTable();
    this.puckImg = this.add.image(0, 0, "tex-puck").setDepth(10);
    this.playerImg = this.add.image(0, 0, "tex-paddle-player").setDepth(11);
    this.aiImg = this.add.image(0, 0, "tex-paddle-ai").setDepth(11);
    this.actions = createPlayerActions(this);

    this.goalFlash = this.add
      .rectangle(TABLE.centerX, TABLE.height / 2, TABLE.width, TABLE.height, 0xffffff, 0)
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
    this.draw();
  }

  update(_time: number, delta: number): void {
    if (this.actions.restartPressed()) {
      this.scene.stop("UI");
      this.scene.start("Game");
      return;
    }
    if (!testOptions.manual) {
      // Fixed steps; a long hitch is dropped rather than replayed.
      this.accMs += Math.min(delta, 100) * testOptions.speed;
      while (this.accMs >= SIM.stepMs && this.scene.isActive()) {
        this.accMs -= SIM.stepMs;
        this.simStep();
      }
    }
    this.draw();
  }

  /** Advance the match by one fixed physics step. */
  simStep(): void {
    const events = stepWorld(this.world, this.playerTarget(), SIM.stepMs);
    for (const event of events) this.handleEvent(event);
  }

  /** Where the player wants the mallet: the pointer, keyboard, or nowhere new. */
  private playerTarget(): Vec | null {
    const kb = this.actions.keyboardVector();
    if (kb.x !== 0 || kb.y !== 0) {
      const from = this.keyTarget ?? this.world.player;
      const step = (PADDLE.keyboardSpeed * SIM.stepMs) / 1000;
      this.keyTarget = { x: from.x + kb.x * step, y: from.y + kb.y * step };
      return this.keyTarget;
    }
    this.keyTarget = null;
    return this.actions.pointerTarget();
  }

  private handleEvent(event: SimEvent): void {
    switch (event.type) {
      case "wall": {
        const now = this.world.run.elapsedMs;
        if (now - this.lastWallSoundMs > 60) sfx.wallHit();
        this.lastWallSoundMs = now;
        break;
      }
      case "mallet":
        sfx.paddleHit(event.speed);
        break;
      case "serve":
        sfx.serve();
        break;
      case "goal":
        this.onGoal(event.scorer);
        break;
      case "handover":
        this.game.events.emit("toast", event.to === "player" ? "7 seconds: your puck" : "7 seconds: AI's puck");
        break;
      case "match-over":
        this.onMatchOver();
        break;
    }
  }

  /** Score update, SDK reporting and effects. The simulation already counted the goal. */
  onGoal(scorer: Side): void {
    const run = this.state;
    this.game.events.emit("score-changed", { player: run.playerScore, ai: run.aiScore });
    hub.score(run.playerScore);
    this.juiceGoal(scorer);
    if (run.status === "complete") {
      const win = run.winner === "player";
      hub.gameOver(run.playerScore, run.elapsedMs);
      if (win) hub.event("match-won", { playerScore: run.playerScore, opponentScore: run.aiScore, seconds: Math.round(run.elapsedMs / 1000) });
      sfx.matchEnd(win);
    }
  }

  private onMatchOver(): void {
    const run = this.state;
    this.scene.stop("UI");
    this.scene.start("GameOver", { playerScore: run.playerScore, aiScore: run.aiScore, won: run.winner === "player" });
  }

  // --- Drawing ---------------------------------------------------------------

  private draw(): void {
    const { puck, player, ai, run } = this.world;
    this.puckImg.setPosition(puck.x, puck.y);
    // A waiting puck blinks so it reads as "about to go live".
    this.puckImg.setAlpha(run.status === "serving" ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 160)) : 1);
    this.puckImg.setVisible(run.status !== "complete");
    this.playerImg.setPosition(player.x, player.y);
    this.aiImg.setPosition(ai.x, ai.y);
  }

  private buildTable(): void {
    this.cameras.main.setBackgroundColor("#0b1020");
    const g = this.add.graphics().setDepth(0);

    // Goal pockets behind each mouth.
    g.fillStyle(0x0b1326, 1);
    g.fillRect(TABLE.x0 - 30, GOAL_TOP, 30, GOAL_BOTTOM - GOAL_TOP);
    g.fillRect(TABLE.x1, GOAL_TOP, 30, GOAL_BOTTOM - GOAL_TOP);

    // Rink surface.
    g.fillStyle(0x0f1b33, 1);
    g.fillRect(TABLE.x0, TABLE.y0, TABLE.x1 - TABLE.x0, TABLE.y1 - TABLE.y0);

    // Centre line and circle.
    g.lineStyle(2, 0x334155, 1);
    g.beginPath();
    g.moveTo(TABLE.centerX, TABLE.y0);
    g.lineTo(TABLE.centerX, TABLE.y1);
    g.strokePath();
    g.strokeCircle(TABLE.centerX, TABLE.centerY, 60);

    // Boundary, open at the goal mouths.
    g.lineStyle(3, 0x475569, 1);
    g.beginPath();
    g.moveTo(TABLE.x0, GOAL_TOP);
    g.lineTo(TABLE.x0, TABLE.y0);
    g.lineTo(TABLE.x1, TABLE.y0);
    g.lineTo(TABLE.x1, GOAL_TOP);
    g.moveTo(TABLE.x1, GOAL_BOTTOM);
    g.lineTo(TABLE.x1, TABLE.y1);
    g.lineTo(TABLE.x0, TABLE.y1);
    g.lineTo(TABLE.x0, GOAL_BOTTOM);
    g.strokePath();

    // Goal mouths: AI defends the left (pink), you defend the right (cyan).
    g.lineStyle(4, 0xfb7185, 0.9);
    g.beginPath();
    g.moveTo(TABLE.x0 - 2, GOAL_TOP);
    g.lineTo(TABLE.x0 - 2, GOAL_BOTTOM);
    g.strokePath();
    g.lineStyle(4, 0x22d3ee, 0.9);
    g.beginPath();
    g.moveTo(TABLE.x1 + 2, GOAL_TOP);
    g.lineTo(TABLE.x1 + 2, GOAL_BOTTOM);
    g.strokePath();
  }

  private juiceGoal(scorer: Side): void {
    sfx.goal();
    this.cameras.main.shake(180, 0.008);
    this.goalFlash.setFillStyle(scorer === "player" ? 0x22d3ee : 0xfb7185, 0.35);
    this.goalFlash.setAlpha(1);
    this.tweens.add({ targets: this.goalFlash, alpha: 0, duration: 260 });
    const burstX = scorer === "player" ? TABLE.x0 : TABLE.x1;
    this.particles.emitParticleAt(burstX, TABLE.centerY, 24);
  }
}
