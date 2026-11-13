import Phaser from "phaser";
import { MATCH } from "../game/constants.js";
import { sfx } from "../systems/audio.js";
import { drawMenuArena } from "../art/table.js";

export class MenuScene extends Phaser.Scene {
  constructor() { super("Menu"); }
  create(): void {
    drawMenuArena(this);
    const text = (x: number, y: number, value: string, size: number, colour: string, bold = false) =>
      this.add.text(x, y, value, { fontFamily: "Arial, sans-serif", fontSize: size, color: colour, fontStyle: bold ? "bold" : "normal" }).setDepth(6);
    text(76, 91, "ROKUMON  /  ARCADE", 14, "#9ab7cd", true);
    text(72, 130, "AIR\nHOCKEY", 66, "#f0f7ff", true).setLineSpacing(-9);
    text(76, 285, `First to ${MATCH.winScore}. Make every shot count.`, 19, "#7de7f4");
    text(76, 333, "YOU: cyan mallet, right half.\nScore in the pink goal on the left.", 17, "#c5d6e5").setLineSpacing(7);
    this.add.rectangle(300, 433, 448, 56, 0x0d667c).setStrokeStyle(2, 0x53d7e8).setDepth(6);
    text(300, 433, "START MATCH", 24, "#effbff", true).setOrigin(0.5);
    text(300, 477, "Click / tap / Space   ·   Move: pointer or WASD", 15, "#afc4d6").setOrigin(0.5);
    const start = () => { sfx.unlock(); sfx.serve(); this.scene.start("Game"); };
    this.input.keyboard!.once("keydown-SPACE", start);
    this.input.once("pointerdown", start);
  }
}
