import Phaser from "phaser";
import { TABLE } from "../game/constants.js";
import { GOAL_BOTTOM, GOAL_TOP } from "../game/physics.js";

/** Artwork only. Every marked edge uses the simulation's existing bounds. */
export function drawArena(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor("#080e1b");
  const base = scene.add.graphics().setDepth(0);
  base.fillStyle(0x172335).fillRoundedRect(24, 54, 912, 462, 18);
  base.lineStyle(2, 0x53677e).strokeRoundedRect(25, 55, 910, 460, 17);
  base.fillStyle(0x080e1b).fillRect(TABLE.x0, TABLE.y0, 880, 430);
  if (scene.textures.exists("art-table-surface")) {
    scene.add.image(TABLE.centerX, TABLE.centerY, "art-table-surface").setDisplaySize(880, 430).setDepth(0.1);
  }
  const g = scene.add.graphics().setDepth(1);
  // Recessed goal wells remain outside the exact legal playing area.
  for (const [x, colour] of [[TABLE.x0 - 22, 0xfb7185], [TABLE.x1, 0x22d3ee]]) {
    g.fillStyle(0x030711).fillRect(x, GOAL_TOP, 22, GOAL_BOTTOM - GOAL_TOP);
    for (let y = GOAL_TOP + 8; y < GOAL_BOTTOM; y += 12) {
      g.lineStyle(1, colour, 0.23).lineBetween(x + 3, y, x + 19, y);
    }
  }
  // Steel rails, warm/cool inserts and small recessed fasteners.
  g.fillStyle(0x33465c).fillRect(TABLE.x0, TABLE.y0 - 12, 880, 12).fillRect(TABLE.x0, TABLE.y1, 880, 12);
  g.lineStyle(2, 0x99b2c5, 0.65).lineBetween(40, 59, 920, 59).lineBetween(40, 511, 920, 511);
  for (const y of [63, 507]) {
    g.lineStyle(3, 0xfb7185, 0.8).lineBetween(60, y, 430, y);
    g.lineStyle(3, 0x22d3ee, 0.8).lineBetween(530, y, 900, y);
    for (const x of [46, 464, 496, 914]) {
      g.fillStyle(0x101a29).fillCircle(x, y, 3);
      g.lineStyle(1, 0x7890a4).lineBetween(x - 1.5, y, x + 1.5, y);
    }
  }
  g.lineStyle(3, 0x8ba7bd, 0.75);
  g.beginPath();
  g.moveTo(TABLE.x0, GOAL_TOP); g.lineTo(TABLE.x0, TABLE.y0); g.lineTo(TABLE.x1, TABLE.y0); g.lineTo(TABLE.x1, GOAL_TOP);
  g.moveTo(TABLE.x1, GOAL_BOTTOM); g.lineTo(TABLE.x1, TABLE.y1); g.lineTo(TABLE.x0, TABLE.y1); g.lineTo(TABLE.x0, GOAL_BOTTOM);
  g.strokePath();
  g.lineStyle(4, 0xfb7185).lineBetween(TABLE.x0 - 2, GOAL_TOP, TABLE.x0 - 2, GOAL_BOTTOM);
  g.lineStyle(4, 0x22d3ee).lineBetween(TABLE.x1 + 2, GOAL_TOP, TABLE.x1 + 2, GOAL_BOTTOM);
  g.lineStyle(2, 0x92bed6, 0.38).lineBetween(TABLE.centerX, TABLE.y0, TABLE.centerX, TABLE.y1);
  g.strokeCircle(TABLE.centerX, TABLE.centerY, 60);
  g.lineStyle(1, 0x92bed6, 0.15).strokeCircle(TABLE.centerX, TABLE.centerY, 65);
  for (const x of [TABLE.x0 + 110, TABLE.x1 - 110]) g.strokeCircle(x, TABLE.centerY, 55);
  // Restrained six-coin centre stamp; it is not a gameplay object.
  g.lineStyle(1.5, 0x92bed6, 0.22);
  for (const dx of [-14, 0, 14]) for (const dy of [-8, 8]) g.strokeCircle(TABLE.centerX + dx, TABLE.centerY + dy, 4);
}

export function drawMenuArena(scene: Phaser.Scene): void {
  drawArena(scene);
  scene.add.image(730, 255, "tex-paddle-player").setDisplaySize(174, 174).setDepth(3);
  scene.add.image(650, 410, "tex-paddle-ai").setDisplaySize(116, 116).setDepth(3);
  scene.add.image(800, 375, "tex-puck").setDisplaySize(60, 60).setDepth(4);
  scene.add.rectangle(300, 280, 520, 442, 0x080e1b, 0.94).setStrokeStyle(1, 0x53728d, 0.7).setDepth(5);
}

