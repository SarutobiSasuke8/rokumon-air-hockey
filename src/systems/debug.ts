import type Phaser from "phaser";
import type { RunState } from "../game/state.js";

declare global {
  interface Window {
    __GAME_DEBUG__?: {
      startGame: () => void;
      snapshotState: () => RunState;
      stepFrames: (frames?: number) => void;
      setSeed: (seed: number) => void;
    };
  }
}

export function installDebug(scene: Phaser.Scene, getState: () => RunState): void {
  window.__GAME_DEBUG__ = {
    startGame: () => scene.scene.start("Game"),
    snapshotState: () => getState(),
    stepFrames: (frames = 1) => {
      for (let i = 0; i < frames; i += 1) scene.game.loop.step(performance.now());
    },
    setSeed: (seed: number) => scene.registry.set("seed", seed),
  };
}
