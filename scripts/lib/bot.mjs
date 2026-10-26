// Scripted right-side player used by the headless match test and the browser
// match test. It reads the puck and returns where it wants its mallet: strike
// the puck toward the left goal when it is on our half, otherwise guard.
const T = { x0: 40, y0: 70, x1: 920, y1: 500, cx: 480, cy: 285 };
const CONTACT = 13 + 27;

export function botTarget(puck, mallet, phase) {
  const onOurSide = puck.x > T.cx;
  if (onOurSide && puck.x < mallet.x + 4) {
    const goalY = T.cy + Math.sin(phase) * 50;
    const mode = Math.floor(phase) % 3;
    const aimY = mode === 0 ? goalY : mode === 1 ? 2 * (T.y0 + 13) - goalY : 2 * (T.y1 - 13) - goalY;
    const dx = T.x0 - 40 - puck.x;
    const dy = aimY - puck.y;
    const d = Math.hypot(dx, dy);
    const ux = dx / d, uy = dy / d;
    const behind = { x: puck.x - ux * (CONTACT + 8), y: puck.y - uy * (CONTACT + 8) };
    const lined = Math.hypot(mallet.x - behind.x, mallet.y - behind.y) < 16;
    return lined ? { x: puck.x + ux * 70, y: puck.y + uy * 70 } : behind;
  }
  if (onOurSide) {
    const side = mallet.y < puck.y ? -1 : 1;
    return { x: puck.x + CONTACT + 8, y: puck.y + side * CONTACT * 1.1 };
  }
  return { x: T.x1 - 60, y: T.cy + (puck.y - T.cy) * 0.6 };
}
