import Phaser from "phaser";
import { TABLE } from "../game/constants.js";
import { sfx } from "../systems/audio.js";

interface GameOverData {
  playerScore: number;
  aiScore: number;
  won: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create(data: GameOverData): void {
    this.cameras.main.setBackgroundColor("#0b1020");

    this.add
      .text(TABLE.centerX, 190, data.won ? "YOU WIN" : "YOU LOSE", {
        fontFamily: "sans-serif",
        fontSize: "54px",
        fontStyle: "bold",
        color: data.won ? "#22d3ee" : "#fb7185",
      })
      .setOrigin(0.5);

    this.add
      .text(TABLE.centerX, 260, `${data.playerScore} - ${data.aiScore}`, {
        fontFamily: "sans-serif",
        fontSize: "32px",
        color: "#e7efff",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(TABLE.centerX, 340, "Click, tap, or press Space to play again", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#fbbf24",
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    const restart = () => {
      sfx.serve();
      this.scene.start("Game");
    };

    // A short guard so a tap or key still held from the last rally does not
    // skip the result screen.
    this.time.delayedCall(600, () => {
      this.input.keyboard!.once("keydown-SPACE", restart);
      this.input.once("pointerdown", restart);
    });
  }
}
