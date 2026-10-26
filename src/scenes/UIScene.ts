import Phaser from "phaser";
import { TABLE } from "../game/constants.js";
import { sfx } from "../systems/audio.js";

/**
 * Score HUD, launched alongside GameScene. Kept as a separate scene (rather
 * than DOM overlay) so it renders on the same canvas/WebGL surface and never
 * has to fight the playfield for layout on resize; it listens for the
 * "score-changed" event on the global game event emitter instead of reaching
 * into GameScene state directly.
 *
 * It also owns the pause overlay (the Game scene cannot take input while it is
 * paused) and the sound toggle.
 */
export class UIScene extends Phaser.Scene {
  private playerText!: Phaser.GameObjects.Text;
  private aiText!: Phaser.GameObjects.Text;

  constructor() {
    super("UI");
  }

  create(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "sans-serif",
      fontSize: "40px",
      fontStyle: "bold",
      color: "#e7efff",
    };

    this.aiText = this.add.text(TABLE.width * 0.32, 24, "0", style).setOrigin(0.5, 0);
    this.playerText = this.add.text(TABLE.width * 0.68, 24, "0", style).setOrigin(0.5, 0);

    this.add
      .text(TABLE.centerX, 30, "-", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        color: "#64748b",
      })
      .setOrigin(0.5, 0);

    // Labels sit beside the numbers so nothing overlaps the table edge.
    this.add
      .text(TABLE.width * 0.32 - 34, 40, "AI", { fontFamily: "sans-serif", fontSize: "16px", fontStyle: "bold", color: "#fb7185" })
      .setOrigin(1, 0.5);
    this.add
      .text(TABLE.width * 0.68 + 34, 40, "YOU", { fontFamily: "sans-serif", fontSize: "16px", fontStyle: "bold", color: "#22d3ee" })
      .setOrigin(0, 0.5);

    // Short notices (the 7-second possession rule) along the bottom edge.
    const toast = this.add
      .text(TABLE.centerX, TABLE.y1 + 20, "", { fontFamily: "sans-serif", fontSize: "18px", color: "#fbbf24" })
      .setOrigin(0.5);
    const onToast = (message: string) => {
      toast.setText(message).setAlpha(1);
      this.tweens.killTweensOf(toast);
      this.tweens.add({ targets: toast, alpha: 0, delay: 1400, duration: 400 });
    };
    this.game.events.on("toast", onToast);

    const onScore = (payload: { player: number; ai: number }) => {
      this.playerText.setText(String(payload.player));
      this.aiText.setText(String(payload.ai));
    };
    this.game.events.on("score-changed", onScore);

    // Sound toggle, top-right of the HUD strip. M toggles it too.
    const soundLabel = () => (sfx.muted ? "SOUND OFF" : "SOUND ON");
    const soundButton = this.add
      .text(TABLE.x1, 14, soundLabel(), { fontFamily: "sans-serif", fontSize: "20px", fontStyle: "bold", color: "#93c5fd" })
      .setOrigin(1, 0)
      .setPadding(14, 10, 0, 10)
      .setInteractive({ useHandCursor: true });
    const toggleSound = () => {
      sfx.unlock();
      sfx.toggleMute();
      soundButton.setText(soundLabel());
    };
    soundButton.on("pointerdown", toggleSound);

    // Pause overlay: shown when the tab is hidden or the window loses focus
    // mid-match, so the puck never keeps sliding while nobody is watching.
    const overlay = this.add
      .container(0, 0, [
        this.add.rectangle(TABLE.centerX, TABLE.height / 2, TABLE.width, TABLE.height, 0x0b1020, 0.78),
        this.add
          .text(TABLE.centerX, 230, "PAUSED", { fontFamily: "sans-serif", fontSize: "48px", fontStyle: "bold", color: "#e7efff" })
          .setOrigin(0.5),
        this.add
          .text(TABLE.centerX, 300, "Tap, click or press Space to resume", { fontFamily: "sans-serif", fontSize: "22px", color: "#fbbf24" })
          .setOrigin(0.5),
      ])
      .setDepth(100)
      .setVisible(false);

    const matchStatus = () =>
      (this.scene.get("Game") as unknown as { state?: { status?: string } }).state?.status;
    const isPaused = () => this.scene.isPaused("Game");
    const pause = () => {
      if (!this.scene.isActive("Game") || matchStatus() === "complete") return;
      this.scene.pause("Game");
      overlay.setVisible(true);
    };
    const resume = () => {
      if (!isPaused()) return;
      sfx.unlock(); // Mobile browsers can suspend the AudioContext while the tab is hidden.
      overlay.setVisible(false);
      this.scene.resume("Game");
    };

    this.game.events.on(Phaser.Core.Events.HIDDEN, pause);
    this.game.events.on(Phaser.Core.Events.BLUR, pause);
    this.input.on("pointerdown", (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (isPaused() && !over.includes(soundButton)) resume();
    });
    const keyboard = this.input.keyboard!;
    keyboard.on("keydown-SPACE", resume);
    keyboard.on("keydown-P", () => (isPaused() ? resume() : pause()));
    keyboard.on("keydown-ESC", () => (isPaused() ? resume() : pause()));
    keyboard.on("keydown-M", toggleSound);

    // The scene stops on every goal/restart cycle from GameScene; detach the
    // listeners so they do not pile up on the shared emitter.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("score-changed", onScore);
      this.game.events.off("toast", onToast);
      this.game.events.off(Phaser.Core.Events.HIDDEN, pause);
      this.game.events.off(Phaser.Core.Events.BLUR, pause);
    });
  }
}
