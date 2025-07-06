/* ws-server.js - WIRD NICHT MEHR BENUTZT! */

"use strict";

/* ------------------------- Imports ---------------------------------- */
const http      = require("http");
const path      = require("path");
const fs        = require("fs");
const crypto    = require("crypto");
const { pipeline } = require("stream");
const { Server } = require("ws");

/* ----------------------- Konfiguration ------------------------------ */
const PORT            = process.env.PORT || 4441;
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || "keule";

const MAX_HISTORY        = 100;
const HASH_RE            = /^[a-f0-9]{64}$/i;
const RATE_LIMIT_COUNT   = 20;           // 20 Msgs …
const RATE_LIMIT_WINDOW  = 10_000;       // … je 10 s
const BACKPRESSURE_LIMIT = 1 * 1024 * 1024; // 1 MiB

const MIME_TYPES = {
  ".html": "text/html",
  ".js"  : "application/javascript",
  ".json": "application/json",
  ".css" : "text/css",
  ".png" : "image/png",
  ".jpg" : "image/jpeg",
  ".svg" : "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const CLOSE_CODES = {
  BLOCKED        : 4000,
  DUPLICATE      : 4001,
  UNKNOWN_ROOM   : 4002,
  INVALID_PACKET : 4003,
  RATE_LIMIT     : 4004,
  BACKPRESSURE   : 4005
};

const PUBLIC_DIR = path.resolve(__dirname);

/* --------------------------- Utils ---------------------------------- */
const randHash = () => crypto.randomBytes(32).toString("hex");
const now      = () => new Date().toISOString().slice(11, 19);
const log      = m => console.log(`[${now()}] ${m}`);

const escapeHTML = str =>
  String(str).replace(/[&<>"'`]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","`":"&#96;"
  }[c]));

/* -------------------- Paket-Validierung ----------------------------- */
function validatePacket(p) {
  if (!p || typeof p !== "object") return false;
  switch (p.type) {
    case "join"      : return typeof p.name    === "string" && p.name.trim();
    case "changeName": return typeof p.newName === "string" && p.newName.trim();
    case "chat"      : return typeof p.message === "string" && p.message.trim();
    default          : return false;
  }
}

/* --------------------- In-Memory-State ------------------------------ */
const roomsMeta = new Map();   // hash → { name, blocklist }
const liveRooms = new Map();   // hash → runtime-Daten
const rateState = new Map();   // ip   → {count,start}

/* ------------------------- Helper ----------------------------------- */
const findRoom = h => roomsMeta.get(h);

function ensureLiveRoom(hash) {
  if (!liveRooms.has(hash)) {
    liveRooms.set(hash, {
      activeClients : new Map(),  // ip → Set<socket>
      userNames     : new WeakMap(),
      ipNames       : new Map(),
      leaveTimers   : new Map(),
      history       : [],
      blocklist     : findRoom(hash)?.blocklist || []
    });
  }
  return liveRooms.get(hash);
}

function withinRateLimit(ip) {
  const nowMs = Date.now();
  const st = rateState.get(ip) || { count: 0, start: nowMs };
  if (nowMs - st.start > RATE_LIMIT_WINDOW) { st.count = 0; st.start = nowMs; }
  st.count += 1; rateState.set(ip, st);
  return st.count <= RATE_LIMIT_COUNT;
}

function banIp(hash, ip) {
  const meta = findRoom(hash); if (!meta) return;
  if (!meta.blocklist.includes(ip)) meta.blocklist.push(ip);
  const room = ensureLiveRoom(hash); room.blocklist = meta.blocklist;

  if (room.activeClients.has(ip)) {
    room.activeClients.get(ip).forEach(s =>
      s.close(CLOSE_CODES.BLOCKED, "IP auto-banned"));
    room.activeClients.delete(ip);
  }
  broadcastSystem(hash,
    `<span class="ip-info hidden">🚫 ${ip} automatisch gebannt (Spam)</span>`);
}

/* -------- Senden mit Backpressure-Guard (Sprint C) ------------------- */
function sendToAll(clients, payload) {
  clients.forEach(set => set.forEach(s => {
    if (s.bufferedAmount > BACKPRESSURE_LIMIT) {
      s.close(CLOSE_CODES.BACKPRESSURE, "Backpressure"); return;
    }
    if (s.readyState === s.OPEN) s.send(payload);
  }));
}

function broadcastSystem(hash, text) {
  const room = liveRooms.get(hash); if (!room) return;
  const payload = JSON.stringify({ type:"system", text });
  room.history.push(payload);
  if (room.history.length > MAX_HISTORY) room.history.shift();
  sendToAll(room.activeClients, payload);
}

/* --------------- Security-Header & File-Streaming (Sprint D) -------- */
const setSec = res => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
};

function streamFile(res, filePath, type, code = 200) {
  const stream = fs.createReadStream(filePath);
  setSec(res);
  res.writeHead(code, { "Content-Type": type });
  pipeline(stream, res, err => {
    if (err && !res.headersSent) {
      res.writeHead(500).end("Fehler");
    }
  });
}

/* ------------------------- HTTP-Server ------------------------------ */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p   = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";

  /* --- Admin-Login -------------------------------------------------- */
  if (p === "/admin/login") {
    if (req.method !== "POST") return res.writeHead(405).end();
    return collectBody(req, res, ({ password }) => {
      if (password !== ADMIN_PASSWORD) return res.writeHead(403).end();
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
    });
  }

  /* --- JSON-APIs ---------------------------------------------------- */
  if (p === "/rooms.json") {
    setSec(res);
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(
         Array.from(roomsMeta, ([h, { name }]) => ({ hash: h, name }))
       ));
    return;
  }
  if (p === "/blocklist.json") {
    const room = findRoom(url.searchParams.get("room"));
    setSec(res);
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(room ? room.blocklist : []));
    return;
  }

  /* --- Raum-Management-APIs ---------------------------------------- */
  if (p === "/admin/add-room" && req.method === "POST") {
    return collectBody(req, res, ({ name }) => {
      if (!name) return res.writeHead(400).end();
      const hash = randHash();
      roomsMeta.set(hash, { hash, name: name.trim(), blocklist: [] });
      res.writeHead(200, { "Content-Type": "application/json" })
         .end(JSON.stringify({ hash, name }));
    });
  }
  if (p === "/admin/remove-room" && req.method === "POST") {
    return collectBody(req, res, ({ hash }) => {
      roomsMeta.delete(hash); liveRooms.delete(hash);
      res.writeHead(204).end();
    });
  }
  if (p === "/admin/update-blocklist" && req.method === "POST") {
    return collectBody(req, res, ({ hash, list }) => {
      const meta = findRoom(hash);
      if (!meta || !Array.isArray(list)) return res.writeHead(400).end();
      meta.blocklist = list; ensureLiveRoom(hash).blocklist = list;
      list.forEach(ip => banIp(hash, ip));   // sofort trennen, falls online
      res.writeHead(204).end();
    });
  }

  /* --- Landing / Chat Routing -------------------------------------- */
  const chatMatch = /^\/chat(?:\.html)?\/([a-f0-9]{64})$/i.exec(p);

  if (p === "/" || p === "/chat" || p === "/chat.html") {
    return streamFile(res, path.join(PUBLIC_DIR, "landing.html"), "text/html");
  }

  if (chatMatch) {
    const hash = chatMatch[1].toLowerCase();
    const entry = findRoom(hash); if (!entry) {
      return streamFile(res, path.join(PUBLIC_DIR, "404.html"), "text/html", 404);
    }

    fs.readFile(path.join(PUBLIC_DIR, "chat.html"), "utf8", (e, html) => {
      if (e) return res.writeHead(500).end("Fehler");
      setSec(res);
      res.writeHead(200, { "Content-Type": "text/html" })
         .end(html.replace(/__ROOM_NAME__/g, entry.name)
                  .replace(/__ROOM_HASH__/g, hash));
    });
    return;
  }

  if (p.startsWith("/chat/") || p.startsWith("/chat.html/")) {
    return streamFile(res, path.join(PUBLIC_DIR, "landing.html"), "text/html");
  }

  /* --- Statische Dateien ------------------------------------------- */
  const safe = path.join(PUBLIC_DIR, path.normalize(p));
  if (!safe.startsWith(PUBLIC_DIR))
    return res.writeHead(403).end();
  fs.access(safe, fs.constants.R_OK, err => {
    if (err) {
      return streamFile(res, path.join(PUBLIC_DIR, "404.html"), "text/html", 404);
    }
    streamFile(res, safe, MIME_TYPES[path.extname(safe)] || "application/octet-stream");
  });
});

/* ------------------- WebSocket-Teil --------------------------------- */
const wss = new Server({ server });
function heartbeat() { this.isAlive = true; }

wss.on("connection", (socket, req) => {
  socket.isAlive = true; socket.on("pong", heartbeat);

  const hash = (req.url || "").replace(/^\/+/, "").toLowerCase();
  let ip     = (req.headers["x-forwarded-for"] || req.socket.remoteAddress).replace(/^.*:/, "");
  if (ip.startsWith("ffff:")) ip = ip.slice(5);

  if (!HASH_RE.test(hash) || !findRoom(hash))
    return socket.close(CLOSE_CODES.UNKNOWN_ROOM, "Unknown room");
  if (ensureLiveRoom(hash).blocklist.includes(ip))
    return socket.close(CLOSE_CODES.BLOCKED, "IP blocked");

  const room = ensureLiveRoom(hash);

  if (room.activeClients.has(ip) && !room.leaveTimers.has(ip))
    return socket.close(CLOSE_CODES.DUPLICATE, "Duplicate connection");

  (room.activeClients.get(ip) ?? room.activeClients.set(ip, new Set()).get(ip)).add(socket);
  room.history.forEach(m => socket.send(m));

  socket.on("message", raw => {
    let pkg;
    try { pkg = JSON.parse(raw); } catch {
      return socket.close(CLOSE_CODES.INVALID_PACKET, "Invalid JSON");
    }
    if (!validatePacket(pkg))
      return socket.close(CLOSE_CODES.INVALID_PACKET, "Invalid packet");

    if (!withinRateLimit(ip)) {
      banIp(hash, ip);
      return socket.close(CLOSE_CODES.RATE_LIMIT, "Rate limit exceeded");
    }
    if (room.blocklist.includes(ip))
      return socket.close(CLOSE_CODES.BLOCKED, "IP blocked");

    switch (pkg.type) {
      case "join": {
        const name = pkg.name.trim().slice(0, 30);
        room.ipNames.set(ip, name);
        room.userNames.set(socket, { name, ip });

        if (room.leaveTimers.has(ip)) {
          clearTimeout(room.leaveTimers.get(ip)); room.leaveTimers.delete(ip);
        } else {
          broadcastSystem(hash,
            `👋 ${escapeHTML(name)}<span class="ip-info hidden"> (${ip})</span> ist beigetreten`);
        }
        break;
      }
      case "changeName": {
        const newName = pkg.newName.trim().slice(0, 30);
        const oldName = room.ipNames.get(ip) || ip;
        if (newName !== oldName) {
          room.ipNames.set(ip, newName);
          room.userNames.set(socket, { name: newName, ip });
          broadcastSystem(hash,
            `<span class="ip-info hidden"> (${ip})</span>✏️ ${escapeHTML(oldName)} heißt jetzt ${escapeHTML(newName)}`);
        }
        break;
      }
      case "chat": {
        const user = room.userNames.get(socket) || { name: "?" };
        const ts   = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
        const text = `[${ts}] ${escapeHTML(user.name)}<span class="ip-info hidden"> (${ip})</span>: ` +
                     escapeHTML(pkg.message);
        room.history.push(text);
        if (room.history.length > MAX_HISTORY) room.history.shift();
        sendToAll(room.activeClients, text);
        break;
      }
    }
  });

  socket.on("close", () => {
    room.activeClients.get(ip)?.delete(socket);
    if (room.activeClients.get(ip)?.size === 0) {
      const t = setTimeout(() => {
        room.activeClients.delete(ip);
        const name = room.ipNames.get(ip) || ip;
        broadcastSystem(hash,
          `🚪 ${escapeHTML(name)} <span class="ip-info hidden"> (${ip})</span> hat den Chat verlassen`);
        room.ipNames.delete(ip); room.leaveTimers.delete(ip);
      }, 3000);
      room.leaveTimers.set(ip, t);
    }
  });
});

/* Heartbeat-Ping (30 s) */
const hb = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 30_000);

/* ------------------- Start & Shutdown ------------------------------- */
server.listen(PORT, () => log(`💬 Server läuft auf Port ${PORT}`));

process.on("SIGINT", () => {
  log("👋 SIGINT – shutdown");
  clearInterval(hb);
  wss.clients.forEach(s => s.terminate());
  server.close(() => process.exit(0));
});

/* ---------------------- Helpers ------------------------------------- */
function collectBody(req, res, cb) {
  let body = "";
  req.on("data", c => body += c);
  req.on("end", () => {
    try { cb(JSON.parse(body || "{}")); }
    catch { res.writeHead(400).end(); }
  });
}
