import Phaser from "phaser";
import { PUCK, PADDLE } from "../game/constants.js";

/**
 * All visuals are procedural. BootScene draws the puck, paddle, and particle
 * textures once with Graphics.generateTexture so no image assets ship with
 * the game (see assets/asset-manifest.json — intentionally empty).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.makeCircleTexture("tex-puck", PUCK.radius, 0xf8fafc, 0xfbbf24);
    this.makeCircleTexture("tex-paddle-player", PADDLE.radius, 0x22d3ee, 0x0e7490);
    this.makeCircleTexture("tex-paddle-ai", PADDLE.radius, 0xfb7185, 0x9f1239);
    this.makeCircleTexture("tex-particle", 6, 0xffffff, 0xffffff);
    this.scene.start("Menu");
  }

  private makeCircleTexture(key: string, radius: number, fill: number, ring: number): void {
    const size = radius * 2 + 4;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(fill, 1);
    g.fillCircle(size / 2, size / 2, radius);
    g.lineStyle(3, ring, 1);
    g.strokeCircle(size / 2, size / 2, radius - 1.5);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
