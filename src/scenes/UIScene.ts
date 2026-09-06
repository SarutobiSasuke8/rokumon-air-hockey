import Phaser from "phaser";
import { TABLE } from "../game/constants.js";

/**
 * Score HUD, launched alongside GameScene. Kept as a separate scene (rather
 * than DOM overlay) so it renders on the same canvas/WebGL surface and never
 * has to fight the playfield for layout on resize; it listens for the
 * "score-changed" event on the global game event emitter instead of reaching
 * into GameScene state directly.
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

    this.add
      .text(TABLE.width * 0.32, 66, "AI", { fontFamily: "sans-serif", fontSize: "14px", color: "#fb7185" })
      .setOrigin(0.5, 0);
    this.add
      .text(TABLE.width * 0.68, 66, "YOU", { fontFamily: "sans-serif", fontSize: "14px", color: "#22d3ee" })
      .setOrigin(0.5, 0);

    const onScore = (payload: { player: number; ai: number }) => {
      this.playerText.setText(String(payload.player));
      this.aiText.setText(String(payload.ai));
    };
    this.game.events.on("score-changed", onScore);

    // The scene stops on every goal/restart cycle from GameScene; detach the
    // listener so it does not pile up on the shared emitter.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("score-changed", onScore);
    });
  }
}
