// Authoritative private matches. No Phaser, public room list or client scores.
import { createServer } from "node:http";
import { randomBytes, randomInt } from "node:crypto";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { loadTs } from "./lib/load-ts.mjs";

const root = new URL("../", import.meta.url);
const { createWorld, stepWorld } = loadTs(fileURLToPath(new URL("src/game/sim.ts", root)));
const { clampMallet } = loadTs(fileURLToPath(new URL("src/game/physics.ts", root)));
const { SIM } = loadTs(fileURLToPath(new URL("src/game/constants.ts", root)));
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const seed = () => randomBytes(4).readUInt32LE(0);

function allowance(bucket, now, rate, burst) {
  bucket.tokens = Math.min(burst, bucket.tokens + (now - bucket.at) * rate / 1000);
  bucket.at = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

export async function createMatchServer({
  host = process.env.MATCH_HOST || "127.0.0.1",
  port = Number(process.env.MATCH_PORT || 8089),
  maxRooms = 128,
  maxConnections = 256,
  pingMs = 15000,
  staleMs = 45000,
  waitingMs = 10 * 60 * 1000,
  allowedOrigins = (process.env.MATCH_ALLOWED_ORIGINS || "").split(",").filter(Boolean),
} = {}) {
  const rooms = new Map();
  const clients = new Map();
  const http = createServer((req, res) => {
    if (req.url?.split("?")[0] === "/health") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, service: "rokumon-air-hockey-match" }));
    } else { res.writeHead(404); res.end("Not found"); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  http.on("upgrade", (req, socket, head) => {
    const path = req.url?.split("?")[0];
    const originAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(req.headers.origin);
    if ((path !== "/match" && path !== "/") || !originAllowed || clients.size >= maxConnections) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws));
  });

  function send(ws, message) {
    if (ws?.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 256 * 1024) { ws.close(1013, "Connection too slow"); return; }
    ws.send(typeof message === "string" ? message : JSON.stringify(message));
  }
  function each(room, fn) { for (const side of ["player", "ai"]) if (room.peers[side]) fn(room.peers[side], side); }
  function roomStatus(room, status) {
    each(room, (ws, side) => send(ws, { type: "room", code: room.code, side, status }));
  }
  function state(room) {
    const w = room.world;
    // Serialize once: both participants receive the same sequence and state.
    const packet = JSON.stringify({ type: "state", seq: ++room.seq, tick: room.tick, round: room.round,
      world: { run: w.run, puck: w.puck, player: w.player, ai: w.ai }, events: room.events.splice(0) });
    each(room, ws => send(ws, packet));
  }
  function startRound(room) {
    room.world = createWorld(seed());
    room.world.mode = "online";
    room.round += 1;
    room.tick = 0;
    room.accumulator = 0;
    room.broadcastMs = 0;
    room.events = [];
    room.ready.clear();
    room.targets = { player: null, ai: null };
    room.started = true;
    room.activeAt = Date.now();
    roomStatus(room, "playing");
    state(room);
  }
  function closeRoom(room, reason) {
    if (!rooms.delete(room.code)) return;
    each(room, ws => {
      const client = clients.get(ws);
      if (client) { client.room = null; client.side = null; }
      send(ws, { type: "closed", reason });
    });
  }
  function fail(client, message) { send(client.ws, { type: "error", message }); }
  function invalid(client, message) {
    if (++client.invalid > 8) client.ws.close(1008, "Invalid messages");
    else fail(client, message);
  }

  wss.on("connection", ws => {
    const now = Date.now();
    const client = { ws, room: null, side: null, seenAt: now, invalid: 0,
      input: { tokens: 6, at: now }, control: { tokens: 4, at: now } };
    clients.set(ws, client);
    ws.on("pong", () => { client.seenAt = Date.now(); });
    ws.on("error", () => { /* close handles cleanup; network errors are peer-local. */ });
    ws.on("close", () => {
      if (client.room) closeRoom(client.room, "opponent-disconnected");
      clients.delete(ws);
    });
    ws.on("message", (data, binary) => {
      if (binary) { invalid(client, "Text JSON messages required"); return; }
      let message;
      try { message = JSON.parse(data.toString()); }
      catch { invalid(client, "Invalid JSON"); return; }
      if (!message || typeof message !== "object" || Array.isArray(message)) { invalid(client, "Invalid message"); return; }
      const at = Date.now();
      if (message.type === "input") {
        if (!allowance(client.input, at, 60, 6)) return;
        if (typeof message.x !== "number" || typeof message.y !== "number" || !Number.isFinite(message.x) || !Number.isFinite(message.y)) {
          invalid(client, "Input requires finite numeric x and y"); return;
        }
        if (!client.room?.started) return;
        client.room.targets[client.side] = clampMallet(client.side === "player" ? "right" : "left", message.x, message.y);
        client.seenAt = at;
        client.room.activeAt = at;
        return;
      }
      if (!allowance(client.control, at, 2, 4)) return;
      client.seenAt = at;
      if (message.type === "create") {
        if (client.room) { fail(client, "Already in a room"); return; }
        if (rooms.size >= maxRooms) { fail(client, "Server is full; try again later"); return; }
        let code;
        do { code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""); } while (rooms.has(code));
        const room = { code, peers: { player: ws, ai: null }, ready: new Set(), started: false,
          world: null, targets: { player: null, ai: null }, seq: 0, tick: 0, round: 0,
          events: [], accumulator: 0, broadcastMs: 0, activeAt: at };
        rooms.set(code, room);
        client.room = room; client.side = "player";
        roomStatus(room, "waiting");
      } else if (message.type === "join") {
        if (client.room) { fail(client, "Already in a room"); return; }
        const code = typeof message.code === "string" ? message.code.trim().toUpperCase() : "";
        const room = /^[A-Z2-9]{6}$/.test(code) ? rooms.get(code) : null;
        if (!room || room.peers.ai || room.started) { fail(client, "Room unavailable"); return; }
        room.peers.ai = ws;
        client.room = room; client.side = "ai";
        startRound(room);
      } else if (message.type === "rematch") {
        const room = client.room;
        if (!room?.started || !room.peers.player || !room.peers.ai) { fail(client, "Two players are required"); return; }
        if (room.world.run.status !== "complete") { fail(client, "Finish the current match first"); return; }
        room.ready.add(client.side);
        if (room.ready.size === 2) startRound(room);
      } else invalid(client, "Unknown message type");
    });
  });

  await new Promise((resolve, reject) => { http.once("error", reject); http.listen(port, host, resolve); });
  let previous = performance.now();
  const ticker = setInterval(() => {
    const now = performance.now();
    // Bound catch-up after a stalled event loop; never send huge physics dt.
    const elapsed = Math.min(now - previous, 100);
    previous = now;
    for (const room of rooms.values()) {
      if (!room.started) continue;
      room.accumulator += elapsed;
      room.broadcastMs += elapsed;
      while (room.accumulator >= SIM.stepMs) {
        room.events.push(...stepWorld(room.world, room.targets.player, SIM.stepMs, room.targets.ai));
        room.accumulator -= SIM.stepMs;
        room.tick += 1;
      }
      if (room.broadcastMs >= 1000 / 30) { room.broadcastMs %= 1000 / 30; state(room); }
    }
  }, 1000 / 120);
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const client of clients.values()) {
      if (now - client.seenAt > staleMs) client.ws.terminate();
      else if (client.ws.readyState === WebSocket.OPEN) client.ws.ping();
    }
    for (const room of rooms.values()) {
      if ((!room.started || room.world.run.status === "complete") && now - room.activeAt > waitingMs) closeRoom(room, "room-expired");
    }
  }, pingMs);
  let closing;
  return {
    address: http.address(),
    close() {
      if (closing) return closing;
      clearInterval(ticker); clearInterval(heartbeat);
      for (const room of [...rooms.values()]) closeRoom(room, "server-shutdown");
      for (const ws of wss.clients) ws.terminate();
      closing = Promise.all([
        new Promise(resolve => wss.close(resolve)),
        new Promise(resolve => { http.close(resolve); http.closeAllConnections(); }),
      ]);
      return closing;
    },
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const server = await createMatchServer();
  console.log(`Private matches: ws://${server.address.address}:${server.address.port}/match`);
  const shutdown = async () => { await server.close(); process.exit(0); };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
