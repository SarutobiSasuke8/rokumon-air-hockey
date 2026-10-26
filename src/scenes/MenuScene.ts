import Phaser from "phaser";
import { TABLE, MATCH } from "../game/constants.js";
import { sfx } from "../systems/audio.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0b1020");

    this.add
      .text(TABLE.centerX, 150, "ROKUMON AIR HOCKEY", {
        fontFamily: "sans-serif",
        fontSize: "46px",
        fontStyle: "bold",
        color: "#e7efff",
      })
      .setOrigin(0.5);

    this.add
      .text(TABLE.centerX, 210, `First to ${MATCH.winScore} goals wins`, {
        fontFamily: "sans-serif",
        fontSize: "20px",
        color: "#93c5fd",
      })
      .setOrigin(0.5);

    this.add
      .text(
        TABLE.centerX,
        320,
        "Move your mallet (cyan, right half) with the mouse or a finger.\nArrow keys / WASD also work. Score in the pink goal on the left.",
        {
          fontFamily: "sans-serif",
          fontSize: "18px",
          color: "#cbd5e1",
          align: "center",
        },
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(TABLE.centerX, 420, "Click, tap, or press Space to start", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#fbbf24",
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 650, yoyo: true, repeat: -1 });

    const start = () => {
      sfx.unlock();
      sfx.serve();
      this.scene.start("Game");
    };

    this.input.keyboard!.once("keydown-SPACE", start);
    this.input.once("pointerdown", start);
  }
}
