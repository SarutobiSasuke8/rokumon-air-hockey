import Phaser from "phaser";

/**
 * Player paddle control: the mallet follows the mouse (moving or dragging)
 * or a finger anywhere in the scene. Arrow keys / WASD also work; while a key
 * is held the keyboard owns the mallet, and the next pointer move takes it
 * back.
 */
export interface PlayerActions {
  /** Latest pointer position in world space, or null while keyboard input
   * owns the paddle. The next pointer move restores pointer control. */
  pointerTarget(): { x: number; y: number } | null;
  keyboardVector(): { x: number; y: number };
  restartPressed(): boolean;
}

export function createPlayerActions(scene: Phaser.Scene): PlayerActions {
  let lastPointer: { x: number; y: number } | null = null;
  // pointer.x / pointer.y are game coordinates, updated as soon as the DOM
  // event arrives. (worldX / worldY only refresh on the next game step, which
  // added a frame of lag.) The camera never scrolls or zooms here.

  scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
    lastPointer = { x: pointer.x, y: pointer.y };
  });
  scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    lastPointer = { x: pointer.x, y: pointer.y };
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
