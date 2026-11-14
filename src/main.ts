/// <reference types="vite/client" />
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { UIScene } from "./scenes/UIScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";
import { LobbyScene } from "./scenes/LobbyScene.js";
import { OnlineScene } from "./scenes/OnlineScene.js";
import { installDebug } from "./systems/debug.js";
import { installCrazyGames } from "./integrations/crazygames.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  backgroundColor: "#0b1020",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, GameOverScene, LobbyScene, OnlineScene],
});

// Drop the static "LOADING TABLE" line once Phaser has booted.
game.events.once(Phaser.Core.Events.READY, () => {
  document.getElementById("loading")?.remove();
  // CrazyGames lifecycle reporting. A no-op unless the game runs on a CrazyGames host.
  void installCrazyGames(game);
});

// Test hooks (state snapshot, deterministic stepping) used by the browser tests.
installDebug(game);
// Development-only scene access for browser control regressions.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
