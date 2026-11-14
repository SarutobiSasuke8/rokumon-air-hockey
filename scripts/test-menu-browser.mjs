// Against the dev preview (which exposes scene state), using real pointer/keys.
// AIR_MENU_URL may override the retained local preview on port 5190.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const origin = process.env.AIR_MENU_URL ?? "http://127.0.0.1:5190/";
const evidence = "docs/evidence/menu-20261114";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "chrome" } : {}) });
const isMenu = page => page.evaluate(() => window.__GAME_DEBUG__.snapshotState().scenes.includes("Menu"));
const choice = page => page.evaluate(() => window.__game.registry.get("difficulty"));
const boot = async page => {
  await page.goto(origin);
  await page.waitForFunction(() => window.__game?.scene.isActive("Menu"));
};
const press = async (page, x, y, touch = false) => {
  const box = await page.locator("canvas").boundingBox();
  assert.ok(box);
  const point = { x: box.x + x * box.width / 960, y: box.y + y * box.height / 540 };
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
};

try {
  for (const [name, viewport, touch] of [
    ["desktop", { width: 1280, height: 800 }, false],
    ["phone", { width: 844, height: 390 }, true],
  ]) {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await boot(page);
    assert.equal(await choice(page), "easy", "new players start with Easy selected");
    await page.screenshot({ path: `${evidence}/${name}-menu.png` });
    await press(page, 780, 210, touch);
    assert.ok(await isMenu(page), "decorative artwork must not start a match");
    await press(page, 300, 331, touch);
    assert.equal(await choice(page), "normal");
    assert.ok(await isMenu(page), "difficulty selection must not start a match");
    for (const [key, difficulty] of [["3", "hard"], ["1", "easy"], ["2", "normal"]]) {
      await page.keyboard.press(key);
      assert.equal(await choice(page), difficulty);
      assert.equal(await page.evaluate(() => localStorage.getItem("rokumon-air-hockey:difficulty")), difficulty);
    }
    await boot(page);
    assert.equal(await choice(page), "normal", "difficulty persists after reload");
    await press(page, 184, 479, touch);
    assert.equal(await page.evaluate(() => localStorage.getItem("rokumon-air-hockey:muted")), "1");
    assert.ok(await isMenu(page), "master sound does not start a match");
    await press(page, 416, 479, touch);
    assert.equal(await page.evaluate(() => localStorage.getItem("rokumon-air-hockey:music")), "0");
    assert.equal(await page.evaluate(() => localStorage.getItem("rokumon-air-hockey:muted")), "1", "music choice preserves master mute");
    assert.ok(await isMenu(page), "music does not start a match");
    await page.screenshot({ path: `${evidence}/${name}-options.png` });
    await press(page, 184, 412, touch);
    await page.waitForFunction(() => window.__GAME_DEBUG__.snapshotState().scenes.includes("Game"));
    assert.equal(await page.evaluate(() => window.__game.scene.getScene("Game").world.difficulty), "normal");
    await boot(page);
    await page.keyboard.press("1");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__GAME_DEBUG__.snapshotState().scenes.includes("Game"));
    assert.equal(await page.evaluate(() => window.__game.scene.getScene("Game").world.difficulty), "easy");
    await boot(page);
    await press(page, 416, 412, touch);
    await page.waitForFunction(() => window.__game.scene.isActive("Lobby"));
    assert.ok(!await page.evaluate(() => window.__game.scene.isActive("Game")), "online entry must not also start solo");
    await page.screenshot({ path: `${evidence}/${name}-lobby.png` });
    assert.deepEqual(errors, []);
    await context.close();
  }
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await boot(page);
  assert.equal(await choice(page), "easy");
  await page.keyboard.press("3");
  assert.equal(await choice(page), "hard", "blocked persistence still permits session selection");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__GAME_DEBUG__.snapshotState().scenes.includes("Game"));
  assert.deepEqual(errors, []);
  await context.close();
  console.log("Menu defaults, persistence, independent controls, explicit solo/online entry and blocked storage passed on desktop and phone.");
} finally {
  await browser.close();
}
