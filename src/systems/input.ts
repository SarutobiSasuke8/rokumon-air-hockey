import Phaser from "phaser";

/**
 * Player paddle control: follow the primary pointer (mouse drag or touch)
 * anywhere in the scene. Falls back to arrow keys / WASD for desktop users
 * who prefer a keyboard, moving the paddle at a fixed speed toward the same
 * target point model so both inputs share one code path.
 */
export interface PlayerActions {
  /** Latest pointer position in world space, or null while keyboard input
   * owns the paddle. A new drag restores pointer control. */
  pointerTarget(): { x: number; y: number } | null;
  keyboardVector(): { x: number; y: number };
  restartPressed(): boolean;
}

export function createPlayerActions(scene: Phaser.Scene): PlayerActions {
  let lastPointer: { x: number; y: number } | null = null;

  scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
    if (pointer.isDown || pointer.wasTouch) {
      lastPointer = { x: pointer.worldX, y: pointer.worldY };
    }
  });
  scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    lastPointer = { x: pointer.worldX, y: pointer.worldY };
  });

  const keys = scene.input.keyboard!.addKeys({
    up: "UP",
    down: "DOWN",
    left: "LEFT",
    right: "RIGHT",
    w: "W",
    a: "A",
    s: "S",
    d: "D",
    restart: "R",
  }) as Record<string, Phaser.Input.Keyboard.Key>;

  return {
    pointerTarget: () => lastPointer,
    keyboardVector: () => {
      const vector = {
        x: (keys.left.isDown || keys.a.isDown ? -1 : 0) + (keys.right.isDown || keys.d.isDown ? 1 : 0),
        y: (keys.up.isDown || keys.w.isDown ? -1 : 0) + (keys.down.isDown || keys.s.isDown ? 1 : 0),
      };
      if (vector.x !== 0 || vector.y !== 0) lastPointer = null;
      return vector;
    },
    restartPressed: () => Phaser.Input.Keyboard.JustDown(keys.restart),
  };
}
