// Browser match test: plays whole first-to-7 matches in Chromium with real
// mouse and touch input, against the built game in dist/.
//
// The page is opened with ?manual=1&seed=N, so the simulation only advances
// when the test calls __GAME_DEBUG__.tick(). Each turn the test reads the
// puck, moves the mouse or finger to where the scripted bot wants the mallet
// (scripts/lib/bot.mjs), then advances 12 physics steps (1/20 s). Input goes
// through the real Phaser pointer path, so this covers control, physics, the
// AI, goals, the win/lose screen, restart and the Rokumon SDK calls.
//
// Run after `npm run build`. Set SCREENSHOT_DIR to save after-screenshots.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { chromium, devices } from "playwright";
import { botTarget } from "./lib/bot.mjs";

const root = resolve("dist");
const mount = "/games/air-hockey/play/";
const shots = process.env.SCREENSHOT_DIR;
const STEPS_PER_TURN = 12; // 1/20 s of play per turn
const BOT_READ_TURNS = 3; // the scripted hand re-reads the puck every 0.15 s
const BOT_SPEED = Number(process.env.BOT_SPEED ?? 750); // px/s the scripted hand may move, so the AI can score too.
const TABLE = { width: 960, height: 540 };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const relative = pathname.startsWith(mount) ? pathname.slice(mount.length) || "index.html" : "missing";
  const file = resolve(root, relative);
  if (!file.startsWith(root + "/") && !file.startsWith(root + "\\")) return response.writeHead(403).end();
  try {
    const bytes = await readFile(file);
    response.setHeader("content-type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html" })[extname(file)] ?? "application/octet-stream");
    response.end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.platform === "win32" ? { channel: "chrome" } : {}) });
if (shots) await mkdir(shots, { recursive: true });

const profiles = [
  { name: "desktop", seed: Number(process.env.SEED_DESKTOP ?? 4), context: { viewport: { width: 1280, height: 800 } }, touch: false },
  { name: "phone-landscape", seed: 7, context: { ...devices["Pixel 7 landscape"] }, touch: true },
  { name: "phone-portrait", seed: 11, context: { ...devices["iPhone 13"] }, touch: true },
];

async function openGame(profile, query) {
  const context = await browser.newContext({ ...profile.context, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === `${origin}/hub-bridge.js`) {
      return route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: "window.hubCalls=[]; window.Hub=Object.fromEntries(['ready','score','gameOver','event'].map(name=>[name,(...args)=>window.hubCalls.push({name,args})]));",
      });
    }
    if (new URL(url).origin !== origin) return route.abort();
    await route.continue();
  });
  await page.goto(`${origin}${mount}?${query}`);
  await page.locator("canvas").waitFor();
  await page.waitForFunction(() => window.__GAME_DEBUG__?.snapshotState().scenes.includes("Menu"));
  const box = await page.locator("canvas").boundingBox();
  const toScreen = (p) => ({ x: box.x + (p.x * box.width) / TABLE.width, y: box.y + (p.y * box.height) / TABLE.height });
  const cdp = profile.touch ? await context.newCDPSession(page) : null;
  let touching = false;
  const input = {
    async tap(p) {
      const s = toScreen(p);
      if (profile.touch) await page.touchscreen.tap(s.x, s.y);
      else await page.mouse.click(s.x, s.y);
    },
    async moveTo(p) {
      const s = toScreen(p);
      if (profile.touch) {
        await cdp.send("Input.dispatchTouchEvent", { type: touching ? "touchMove" : "touchStart", touchPoints: [{ x: s.x, y: s.y }] });
        touching = true;
      } else {
        await page.mouse.move(s.x, s.y);
      }
    },
    async release() {
      if (profile.touch && touching) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      touching = false;
    },
  };
  return { context, page, errors, input, box };
}

async function shot(page, profile, label) {
  if (shots) await page.screenshot({ path: join(shots, `${profile.name}-${label}.png`) });
}

async function playMatch(profile) {
  const { context, page, errors, input, box } = await openGame(profile, `manual=1&seed=${profile.seed}`);
  assert.ok(box.width > 300, `${profile.name}: canvas is laid out (${box.width}px wide)`);
  await shot(page, profile, "1-title");
  await input.tap({ x: 860, y: 285 });
  await page.waitForFunction(() => window.__GAME_DEBUG__.snapshotState().scenes.includes("Game"));

  let state = await page.evaluate(() => window.__GAME_DEBUG__.snapshotState());
  assert.equal(state.status, "serving");
  let hand = { ...state.player };
  let phase = profile.seed;
  let turns = 0;
  let midShot = false;
  const scores = [];
  let malletChecks = 0;
  let want = hand;
  while (!state.scenes.includes("GameOver")) {
    assert.ok(turns < 12000, `${profile.name}: match did not finish (score ${state.playerScore}-${state.aiScore})`);
    if (state.puck) {
      // Physics sanity on every turn: the puck stays on the table or in a goal.
      assert.ok(state.puck.y >= 70 + 13 - 0.01 && state.puck.y <= 500 - 13 + 0.01, `${profile.name}: puck y ${state.puck.y}`);
      assert.ok(state.puck.x > -60 && state.puck.x < 1020, `${profile.name}: puck x ${state.puck.x}`);
      assert.ok(state.player.x >= 480 + 27 && state.player.x <= 920 - 27, `${profile.name}: player mallet stays in its half`);
      assert.ok(state.ai.x >= 40 + 27 && state.ai.x <= 480 - 27, `${profile.name}: AI mallet stays in its half`);
      if (turns % BOT_READ_TURNS === 0) {
        phase += 0.7;
        want = botTarget(state.puck, state.player, phase);
      }
      const dx = want.x - hand.x;
      const dy = want.y - hand.y;
      const d = Math.hypot(dx, dy);
      const max = (BOT_SPEED * STEPS_PER_TURN) / 240;
      hand = d <= max ? want : { x: hand.x + (dx / d) * max, y: hand.y + (dy / d) * max };
      hand = { x: Math.min(905, Math.max(500, hand.x)), y: Math.min(485, Math.max(85, hand.y)) };
      await input.moveTo(hand);
    }
    const before = state;
    state = await page.evaluate((n) => window.__GAME_DEBUG__.tick(n), STEPS_PER_TURN);
    // The mallet follows the pointer: once the hand is still, it catches up.
    if (state.player && before.player && Math.hypot(state.player.x - hand.x, state.player.y - hand.y) < 1) malletChecks += 1;
    if (state.playerScore !== undefined && `${state.playerScore}-${state.aiScore}` !== scores.at(-1)) scores.push(`${state.playerScore}-${state.aiScore}`);
    if (!midShot && state.status === "playing" && state.playerScore + state.aiScore >= 3) {
      midShot = true;
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      await shot(page, profile, "2-match");
    }
    turns += 1;
  }
  await input.release();

  const final = await page.evaluate(() => window.__GAME_DEBUG__.snapshotState());
  const winnerScore = Math.max(final.playerScore, final.aiScore);
  assert.equal(winnerScore, 7, `${profile.name}: first to 7 ends the match`);
  assert.equal(final.status, "complete");
  assert.ok(malletChecks > 100, `${profile.name}: the mallet tracked the pointer (${malletChecks} exact catches)`);

  const calls = await page.evaluate(() => window.hubCalls);
  const won = final.winner === "player";
  assert.equal(calls.filter((c) => c.name === "ready").length, 1);
  assert.equal(calls.filter((c) => c.name === "score").length, final.playerScore + final.aiScore, "one SDK score call per goal");
  assert.equal(calls.filter((c) => c.name === "gameOver").length, 1, "one SDK gameOver call");
  const matchWon = calls.filter((c) => c.name === "event" && c.args[0] === "match-won");
  assert.equal(matchWon.length, won ? 1 : 0, "match-won is reported only for a player win");
  if (won) assert.equal(matchWon[0].args[1].playerScore, 7);

  await page.waitForTimeout(700); // result screen ignores input for 600 ms
  await shot(page, profile, `3-result-${won ? "win" : "lose"}`);
  await input.tap({ x: 480, y: 400 });
  await page.waitForFunction(() => {
    const s = window.__GAME_DEBUG__.snapshotState();
    return s.scenes.includes("Game") && s.status === "serving" && s.playerScore === 0 && s.aiScore === 0;
  });
  assert.deepEqual(errors, []);
  await context.close();
  return { profile: profile.name, playerScore: final.playerScore, aiScore: final.aiScore, final: `${final.playerScore}-${final.aiScore}`, winner: final.winner, goals: scores.length - 1, turns };
}

async function realTimeCheck(profile) {
  // Unstepped play at normal speed: the mallet follows the pointer and the
  // served puck goes live and moves once the bot strikes it.
  const { context, page, errors, input } = await openGame(profile, "seed=2");
  await input.tap({ x: 860, y: 285 });
  await page.waitForFunction(() => window.__GAME_DEBUG__.snapshotState().scenes.includes("Game"));
  await input.moveTo({ x: 700, y: 200 });
  await page.waitForTimeout(400);
  let s = await page.evaluate(() => window.__GAME_DEBUG__.snapshotState());
  assert.ok(Math.hypot(s.player.x - 700, s.player.y - 200) < 1.5, `${profile.name}: real-time mallet at pointer (${s.player.x}, ${s.player.y})`);
  await page.waitForFunction(() => window.__GAME_DEBUG__.snapshotState().status === "playing", null, { timeout: 5000 });
  const deadline = Date.now() + 15000;
  let moved = false;
  while (Date.now() < deadline && !moved) {
    s = await page.evaluate(() => window.__GAME_DEBUG__.snapshotState());
    if (s.puck && Math.hypot(s.puck.vx, s.puck.vy) > 50) moved = true;
    else if (s.puck) await input.moveTo(botTarget(s.puck, s.player, 0));
    await page.waitForTimeout(30);
  }
  await input.release();
  assert.ok(moved, `${profile.name}: puck went live in real time`);
  assert.deepEqual(errors, []);
  await context.close();
}

try {
  const results = [];
  const only = process.env.PROFILES?.split(",");
  for (const profile of profiles) if (!only || only.includes(profile.name)) results.push(await playMatch(profile));
  for (const profile of [profiles[0], profiles[1]]) await realTimeCheck(profile);
  if (!only) {
    // Across the runs both sides must score (seeded, so this is repeatable).
    assert.ok(results.reduce((n, r) => n + r.playerScore, 0) > 0, "the player scored");
    assert.ok(results.reduce((n, r) => n + r.aiScore, 0) > 0, "the AI scored");
  }
  for (const r of results) console.log(`${r.profile}: full match ${r.final}, ${r.winner} won, ${r.goals} goals, ${r.turns} turns`);
  console.log("Browser match test passed: desktop mouse and phone touch matches to 7, result screens, restart, SDK calls, real-time control.");
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
}
