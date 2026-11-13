import Phaser from "phaser";
import { sfx } from "../systems/audio.js";
import { drawMenuArena } from "../art/table.js";
interface GameOverData { playerScore: number; aiScore: number; won: boolean }
export class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }
  create(data: GameOverData): void {
    drawMenuArena(this);
    const text = (y: number, value: string, size: number, colour: string) =>
      this.add.text(300, y, value, { fontFamily: "Arial, sans-serif", fontSize: size, fontStyle: "bold", color: colour }).setOrigin(0.5).setDepth(6);
    text(110, "ROKUMON  /  MATCH RESULT", 15, "#9ab7cd");
    text(190, data.won ? "YOU WIN" : "MATCH OVER", 48, data.won ? "#73e8f4" : "#ff99ac");
    text(274, `${data.playerScore}  :  ${data.aiScore}`, 64, "#f0f7ff");
    text(329, "YOU                         AI", 15, "#9ab7cd");
    this.add.rectangle(300, 411, 420, 58, 0x0d667c).setStrokeStyle(2, 0x53d7e8).setDepth(6);
    text(411, "PLAY AGAIN", 24, "#effbff");
    text(469, "Click, tap or press Space", 16, "#afc4d6");
    const restart = () => { sfx.serve(); this.scene.start("Game"); };
    this.time.delayedCall(600, () => {
      this.input.keyboard!.once("keydown-SPACE", restart);
      this.input.once("pointerdown", restart);
    });
  }
}
