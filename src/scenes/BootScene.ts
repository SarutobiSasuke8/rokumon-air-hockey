import Phaser from "phaser";
import { PUCK, PADDLE } from "../game/constants.js";

/**
 * Loads the original raster art pack. Exact-size procedural textures remain
 * available if an asset fails to load; physics never reads texture dimensions.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.add.text(480, 270, "PREPARING THE RINK", { fontFamily: "sans-serif", fontSize: "20px", color: "#94cddd" }).setOrigin(0.5);
    this.load.image("art-table-surface", "assets/art/table-surface-v1.webp");
    this.load.image("tex-paddle-player", "assets/art/mallet-cyan-v1.webp");
    this.load.image("tex-paddle-ai", "assets/art/mallet-coral-v1.webp");
    this.load.image("tex-puck", "assets/art/puck-ivory-v1.webp");
  }

  create(): void {
    this.makeCircleTexture("tex-puck", PUCK.radius, 0xf8fafc, 0xfbbf24);
    this.makeCircleTexture("tex-paddle-player", PADDLE.radius, 0x22d3ee, 0x0e7490);
    this.makeCircleTexture("tex-paddle-ai", PADDLE.radius, 0xfb7185, 0x9f1239);
    this.makeCircleTexture("tex-particle", 6, 0xffffff, 0xffffff);
    this.scene.start("Menu");
  }

  private makeCircleTexture(key: string, radius: number, fill: number, ring: number): void {
    if (this.textures.exists(key)) return;
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
