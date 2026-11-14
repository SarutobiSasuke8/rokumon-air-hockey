import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";
import { createMatchServer } from "./match-server.mjs";

const server = await createMatchServer({ port: 0, pingMs: 100, staleMs: 1000, maxRooms: 2 });
const url = `ws://127.0.0.1:${server.address.port}/match`;
const sockets = [];
async function connect(target = url, options = {}) {
  const ws = new WebSocket(target, options);
  ws.messages = [];
  ws.on("message", data => { ws.messages.push(JSON.parse(data.toString())); });
  await once(ws, "open");
  sockets.push(ws);
  return ws;
}
function send(ws, message) { ws.send(JSON.stringify(message)); }
function latest(ws) { return ws.messages.filter(m => m.type === "state").at(-1); }
async function wait(ws, predicate, timeout = 5000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const message = ws.messages.find(predicate);
    if (message) return message;
    await delay(10);
  }
  throw new Error(`Message timeout: ${predicate.toString()}`);
}

try {
  const host = await connect(), guest = await connect(), outsider = await connect();
  send(host, { type: "create" });
  const waiting = await wait(host, m => m.type === "room");
  assert.match(waiting.code, /^[A-Z2-9]{6}$/);
  assert.equal(waiting.side, "player");
  assert.equal(waiting.status, "waiting");
  await delay(100);
  assert(!host.messages.some(m => m.type === "state"), "waiting host must stay in the lobby");
  send(guest, { type: "join", code: waiting.code.toLowerCase() });
  const joined = await wait(guest, m => m.type === "room");
  assert.equal(joined.side, "ai");
  assert.equal(joined.status, "playing");
  const first = await wait(host, m => m.type === "state");
  assert.deepEqual(await wait(guest, m => m.type === "state" && m.seq === first.seq), first);
  assert.equal(guest.messages[0].type, "room", "assignment precedes state");
  send(outsider, { type: "join", code: waiting.code });
  await wait(outsider, m => m.type === "error" && m.message === "Room unavailable");
  assert(!outsider.messages.some(m => m.type === "state"), "room has exactly two participants");

  send(host, { type: "input", x: -1e9, y: -1e9, side: "ai" });
  send(guest, { type: "input", x: 1e9, y: 1e9, side: "player" });
  const clamped = await wait(host, m => m.type === "state" && m.world.player.x < 512 && m.world.ai.x > 448);
  assert(clamped.world.player.y >= 97 && clamped.world.ai.y <= 473);
  assert(clamped.world.player.x > 480 && clamped.world.ai.x < 480, "clients cannot choose the other side");
  send(host, { type: "input", x: null, y: "not-a-number" });
  await wait(host, m => m.type === "error" && m.message.includes("finite numeric"));
  send(host, { type: "score", playerScore: 7 });
  await wait(host, m => m.type === "error" && m.message === "Unknown message type");
  assert.equal(latest(host).world.run.playerScore, 0, "scores are server-owned");
  for (let i = 0; i < 300; i++) send(outsider, { type: "input", x: 700, y: 285 });
  await delay(50);
  assert(host.readyState === WebSocket.OPEN && guest.readyState === WebSocket.OPEN, "input flood cannot disrupt other peers");

  send(host, { type: "rematch" });
  await wait(host, m => m.type === "error" && m.message === "Finish the current match first");
  send(guest, { type: "rematch" });
  await wait(guest, m => m.type === "error" && m.message === "Finish the current match first");
  assert.equal(latest(host).round, 1, "live-match rematch requests cannot reset play");

  // Real clients intentionally cooperate to score into the left goal. During
  // each serve the appropriate mallet gets behind the puck, then strikes it.
  // No server hooks, client scores, altered clocks or injected puck state.
  let attacker = "player";
  const play = raw => {
    const m = JSON.parse(raw.toString());
    if (m.type !== "state" || m.round !== 1 || m.world.run.status === "complete") return;
    const w = m.world;
    if (w.run.status === "serving") attacker = w.puck.x > 480 ? "player" : "ai";
    const strike = w.run.status === "serving" ? { x: w.puck.x + 65, y: w.puck.y } : { x: attacker === "player" ? 511 : 90, y: 285 };
    send(host, { type: "input", ...(attacker === "player" ? strike : { x: 850, y: 110 }) });
    send(guest, { type: "input", ...(attacker === "ai" ? strike : { x: 110, y: 110 }) });
  };
  host.on("message", play);
  play(JSON.stringify(latest(host)));
  const finished = await wait(host, m => m.type === "state" && m.round === 1 && m.world.run.status === "complete", 35000);
  assert.equal(finished.world.run.playerScore, 7);
  assert.equal(finished.world.run.winner, "player");
  assert.deepEqual(await wait(guest, m => m.type === "state" && m.seq === finished.seq), finished);
  await wait(host, m => m.type === "state" && m.events.some(e => e.type === "match-over"));
  host.off("message", play);
  const packets = host.messages.filter(m => m.type === "state" && m.round === 1);
  assert.equal(packets.flatMap(m => m.events).filter(e => e.type === "goal").length, 7, "all goal events survive batching");
  assert.equal(packets.flatMap(m => m.events).filter(e => e.type === "match-over").length, 1);
  for (const packet of packets) {
    const other = guest.messages.find(m => m.type === "state" && m.seq === packet.seq);
    if (other) assert.deepEqual(other, packet, `shared state seq ${packet.seq}`);
  }
  const seq = latest(host).seq;
  send(host, { type: "rematch" });
  await delay(100);
  assert.equal(latest(host).round, 1, "only one post-match vote cannot reset play");
  send(guest, { type: "rematch" });
  await wait(host, m => m.type === "state" && m.round === 2 && m.seq > seq && m.tick === 0 && m.world.run.playerScore === 0);
  guest.close();
  await wait(host, m => m.type === "closed" && m.reason === "opponent-disconnected");
  send(outsider, { type: "join", code: waiting.code });
  await delay(50);
  assert(!outsider.messages.some(m => m.type === "room"), "disconnected room code is removed");
  console.log("Private match checks passed: real sockets, assignment, shared sequences, clamped input, authority, full seven-goal finish, batched events, mutual rematches and disconnect.");
} finally {
  for (const ws of sockets) ws.terminate();
  await server.close();
}

// Short-lived isolated servers exercise expiry and missing-pong cleanup.
const cleanup = await createMatchServer({ port: 0, pingMs: 20, staleMs: 120, waitingMs: 80 });
try {
  const healthy = await connect(`ws://127.0.0.1:${cleanup.address.port}/match`);
  send(healthy, { type: "create" });
  await wait(healthy, m => m.type === "closed" && m.reason === "room-expired");
  const stale = await connect(`ws://127.0.0.1:${cleanup.address.port}/match`, { autoPong: false });
  await Promise.race([once(stale, "close"), delay(2000).then(() => { throw new Error("Stale peer was not removed"); })]);
  healthy.terminate();
  console.log("Private match cleanup checks passed: waiting-room expiry and missed-pong removal.");
} finally {
  await cleanup.close();
}
