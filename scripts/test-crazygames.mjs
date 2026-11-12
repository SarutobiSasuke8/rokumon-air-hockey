// CrazyGames SDK checks: host detection, no-op without the SDK, a failed or
// throwing SDK never breaks play, and gameplay start/stop are not repeated.
import assert from "node:assert/strict";
import { loadTs } from "./lib/load-ts.mjs";

const { shouldUseCrazyGames, createCrazyGames } = loadTs("src/integrations/crazygames.ts");

assert.equal(shouldUseCrazyGames("games.crazygames.com", ""), true);
assert.equal(shouldUseCrazyGames("crazygames.com", ""), true);
assert.equal(shouldUseCrazyGames("localhost", "?crazygames=1"), true);
assert.equal(shouldUseCrazyGames("rokumon.games", ""), false);
assert.equal(shouldUseCrazyGames("notcrazygames.com", ""), false);
assert.equal(shouldUseCrazyGames("crazygames.com.evil.example", ""), false);

// No SDK on the page: init reports false and every call is silent.
{
  const cg = createCrazyGames(() => undefined);
  assert.equal(await cg.init(), false);
  cg.gameplayStart(); cg.gameplayStop(); cg.happytime(); cg.loadingStart(); cg.loadingStop();
}

// Failed init: nothing is forwarded afterwards.
{
  const calls = [];
  const sdk = { init: async () => { throw new Error("blocked"); }, game: { gameplayStart: () => calls.push("start") } };
  const cg = createCrazyGames(() => sdk);
  assert.equal(await cg.init(), false);
  cg.gameplayStart();
  assert.deepEqual(calls, []);
}

// Working SDK: start/stop are paired and not repeated; a throwing call is swallowed.
{
  const calls = [];
  const game = Object.fromEntries(["gameplayStart", "gameplayStop", "loadingStart", "loadingStop", "happytime"].map((n) => [n, () => calls.push(n)]));
  const sdk = { init: async () => {}, game };
  const cg = createCrazyGames(() => sdk);
  cg.gameplayStart(); // before init: dropped
  assert.equal(await cg.init(), true);
  cg.gameplayStart(); cg.gameplayStart(); cg.gameplayStop(); cg.gameplayStop(); cg.happytime();
  assert.deepEqual(calls, ["gameplayStart", "gameplayStop", "happytime"]);
  game.happytime = () => { throw new Error("boom"); };
  cg.happytime();
}
console.log("CrazyGames SDK checks passed");
