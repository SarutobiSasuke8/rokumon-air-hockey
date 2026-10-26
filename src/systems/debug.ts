import type Phaser from "phaser";
import type { RunState } from "../game/state.js";

/**
 * Test-only query flags, read once at boot. Normal play ignores them.
 *   ?seed=N   fixed seed for kick-off side and AI aim (repeatable runs)
 *   ?speed=K  run the simulation K times faster (1 to 8)
 *   ?manual=1 the simulation only advances through __GAME_DEBUG__.tick(),
 *             so a browser test can play a deterministic match
 */
function readOptions(): { seed: number | null; speed: number; manual: boolean } {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(globalThis.location?.search ?? "");
  } catch {
    params = new URLSearchParams();
  }
  const seed = Number.parseInt(params.get("seed") ?? "", 10);
  const speed = Number.parseFloat(params.get("speed") ?? "1");
  return {
    seed: Number.isFinite(seed) ? seed : null,
    speed: Number.isFinite(speed) ? Math.min(8, Math.max(1, speed)) : 1,
    manual: params.get("manual") === "1",
  };
}

export const testOptions = readOptions();

export interface DebugSnapshot extends Partial<RunState> {
  scenes: string[];
  puck?: { x: number; y: number; vx: number; vy: number };
  player?: { x: number; y: number };
  ai?: { x: number; y: number };
}

type GameSceneLike = Phaser.Scene & { world?: { run: RunState; puck: DebugSnapshot["puck"]; player: DebugSnapshot["player"]; ai: DebugSnapshot["ai"] }; simStep(): void };

declare global {
  interface Window {
    __GAME_DEBUG__?: {
      startGame: () => void;
      snapshotState: () => DebugSnapshot;
      /** Advance the match by `steps` fixed physics steps (use with ?manual=1). */
      tick: (steps?: number) => DebugSnapshot;
      setSeed: (seed: number) => void;
    };
  }
}

export function installDebug(game: Phaser.Game): void {
  const gameScene = () => game.scene.getScene("Game") as GameSceneLike | null;
  const activeKeys = () => game.scene.getScenes(true).map((scene) => scene.scene.key);
  const snapshot = (): DebugSnapshot => {
    const scenes = activeKeys();
    const world = gameScene()?.world;
    if (!world || !scenes.includes("Game")) return { scenes, ...(world ? { ...world.run } : { status: undefined }) };
    return { scenes, ...JSON.parse(JSON.stringify(world.run)), puck: { ...world.puck! }, player: { ...world.player! }, ai: { ...world.ai! } };
  };
  window.__GAME_DEBUG__ = {
    startGame: () => game.scene.getScenes(true)[0]?.scene.start("Game"),
    snapshotState: snapshot,
    tick: (steps = 1) => {
      const scene = gameScene();
      for (let i = 0; i < steps && scene && game.scene.isActive("Game") && !game.scene.isPaused("Game"); i += 1) scene.simStep();
      return snapshot();
    },
    setSeed: (seed: number) => game.registry.set("seed", seed),
  };
}
