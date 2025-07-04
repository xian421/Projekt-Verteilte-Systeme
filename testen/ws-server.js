/* ws-server.js */
/* eslint-disable no-console */
"use strict";

/* ----------- Imports -------------------------------------------------- */
const http     = require("http");
const path     = require("path");
const fs       = require("fs");
const crypto   = require("crypto");
const { Server } = require("ws");

/* ----------- Konfiguration ------------------------------------------- */
const PORT         = 4441;
const MAX_HISTORY  = 100;
const HASH_RE      = /^[a-f0-9]{64}$/i;
const MIME_TYPES   = {
  ".html": "text/html",
  ".js"  : "application/javascript",
  ".json": "application/json",
  ".css" : "text/css"
};

/* ----------- Utils ---------------------------------------------------- */
const randHash  = () => crypto.randomBytes(32).toString("hex"); // 64 Hex-Zeichen
const now       = () => new Date().toISOString().slice(11, 19);
const log       = m => console.log(`[${now()}] ${m}`);
const error     = m => console.error(`[${now()}] ${m}`);

// Minimale, aber robuste XSS-Prävention für Chat-Nachrichten
const escapeHTML = (str = "") => String(str).replace(/[&<>"'`]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;"
}[c]));

/* ----------- In-Memory-State ----------------------------------------- */
let roomsList = [];                  // [{ hash, name, blocklist: string[] }]
const rooms   = Object.create(null); // hash → room-Objekt (clients, history …)

/* ----------- Helper --------------------------------------------------- */
const findRoom   = hash => roomsList.find(r => r.hash === hash);
const ensureRoom = hash => (
  rooms[hash] ??= {
    activeClients : new Map(),   // ip → Set<socket>
    userNames     : new WeakMap(),
    ipNames       : new Map(),
    leaveTimers   : new Map(),
    history       : [],
    blocklist     : []          // Fallback, falls im roomsList-Objekt leer
  }
);

const sendToAll = (clients, payload) =>
  clients.forEach(set => set.forEach(s => s.readyState === s.OPEN && s.send(payload)));

const broadcastSystem = (hash, text) => {
  const room = rooms[hash];
  if (!room) return;
  const payload = JSON.stringify({ type: "system", text });
  room.history.push(payload);
  if (room.history.length > MAX_HISTORY) room.history.shift();
  sendToAll(room.activeClients, payload);
  log(payload);
};

const isBlocked = (ip, hash) => findRoom(hash)?.blocklist?.includes(ip);

const serveFile = (res, file, type = "text/html", code = 200) => {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); return res.end("Fehler"); }
    res.writeHead(code, { "Content-Type": type }).end(data);
  });
};
const serveLanding = res => serveFile(res, "./landing.html");
const serve404     = res => serveFile(res, "./404.html", "text/html", 404);

/* ----------- HTTP-Server --------------------------------------------- */
const server = http.createServer((req, res) => {
  const url      = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";

  /* --- Admin- & JSON-API --------------------------------------------- */
  if (pathname === "/admin/login") {
    if (req.method !== "POST") return res.writeHead(405).end();
    return collectBody(req, res, ({ password }) => {
      if (password !== "keule") return res.writeHead(403).end();
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
    });
  }


  if (pathname === "/rooms.json") {
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(roomsList));
    return;
  }

  if (pathname === "/blocklist.json") {
    const room = findRoom(url.searchParams.get("room"));
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(room ? room.blocklist : []));
    return;
  }

  if (pathname === "/admin/add-room" && req.method === "POST") {
    return collectBody(req, res, ({ name }) => {
      if (!name) return res.writeHead(400).end();
      const hash = randHash();
      roomsList.push({ hash, name: name.trim(), blocklist: [] });
      res.writeHead(200, { "Content-Type": "application/json" })
         .end(JSON.stringify({ hash, name }));
    });
  }

  if (pathname === "/admin/remove-room" && req.method === "POST") {
    return collectBody(req, res, ({ hash }) => {
      const idx = roomsList.findIndex(r => r.hash === hash);
      if (idx === -1) return res.writeHead(404).end();
      rooms[hash] = undefined;          // GC des Raum-Objekts
      roomsList.splice(idx, 1);
      res.writeHead(204).end();
    });
  }

  if (pathname === "/admin/update-blocklist" && req.method === "POST") {
    return collectBody(req, res, ({ hash, list }) => {
      const roomEntry = findRoom(hash);
      if (!roomEntry || !Array.isArray(list)) return res.writeHead(400).end();

      /* 1. Blockliste abspeichern (roomsList + Live-Room) */
      roomEntry.blocklist = list;
      const room = ensureRoom(hash);
      room.blocklist = list;

      /* 2. Alle aktuell verbundenen, jetzt geblockten IPs sofort kicken */
      for (const [ip, sockets] of room.activeClients) {
        if (!list.includes(ip)) continue;
        sockets.forEach(s => s.close(4000, "IP blocked"));
        room.activeClients.delete(ip);
        broadcastSystem(hash,
          `<span class="ip-info hidden">🚫 ${ip} wurde gebannt – Verbindung getrennt</span>`);
        log(`🚫 ${ip} sofort getrennt (Blocklist-Update)`);
      }

      res.writeHead(204).end();
    });
  }

  /* --- Landing / Chat Routing ---------------------------------------- */
  const chatMatch = /^\/chat\.html\/([a-f0-9]{64})$/i.exec(pathname);

  if (pathname === "/" || pathname === "/chat.html")
    return serveLanding(res);

  if (chatMatch) {
    const hash  = chatMatch[1].toLowerCase();
    const entry = findRoom(hash);
    if (!entry) return serve404(res);

    fs.readFile("./chat.html", "utf8", (err, html) => {
      if (err) { res.writeHead(500); return res.end("Fehler"); }
      res.writeHead(200, { "Content-Type": "text/html" })
         .end(html.replace(/__ROOM_NAME__/g, entry.name)
                   .replace(/__ROOM_HASH__/g, entry.hash));
    });
    return;
  }

  if (pathname.startsWith("/chat.html/"))
    return serveLanding(res);

  /* --- Statische Dateien --------------------------------------------- */
  let safe = "." + path.normalize(pathname);
  if (!safe.startsWith(".")) safe = "." + safe;     // Directory-Traversal-Guard

  const type = MIME_TYPES[path.extname(safe)] ?? "text/plain";
  fs.readFile(safe, (err, data) => {
    if (err) return serve404(res);
    res.writeHead(200, { "Content-Type": type }).end(data);
  });
});

/* ----------- WebSocket-Teil ------------------------------------------ */
// Websocket läuft auf selbem Port wie HTTP-Server
const wss = new Server({ server });

wss.on("connection", (socket, req) => {
  const hash = (req.url || "").replace(/^\/+/, "").toLowerCase();
  let ip     = (req.headers["x-forwarded-for"] ?? req.socket.remoteAddress)
                 .replace(/^.*:/, "");
  if (ip.startsWith("ffff:")) ip = ip.slice(5);

  log(`➡️ Neue Verbindung von ${ip} für Raum ${hash}`);

  /* --- Sanity-Checks -------------------------------------------------- */
  if (!HASH_RE.test(hash) || !findRoom(hash))
    return socket.close(4002, "Unknown room");

  if (isBlocked(ip, hash)) {
    broadcastSystem(hash,
      `<span class="ip-info hidden">🚫 Geblockter Verbindungsversuch: ${ip}</span>`);
    return socket.close(4000, "IP blocked");
  }

  const room = ensureRoom(hash);

  if (room.activeClients.has(ip) && !room.leaveTimers.has(ip)) {
    broadcastSystem(hash,
      `<span class="ip-info hidden">⚠️ Doppelverbindung von ${ip} abgelehnt</span>`);
    return socket.close(4001, "Duplicate connection");
  }

  /* --- Aufnahme in Raum ---------------------------------------------- */
  (room.activeClients.get(ip) ?? room.activeClients.set(ip, new Set()).get(ip))
    .add(socket);

  room.history.forEach(m => socket.send(m));
  log(`✅ ${ip} wurde dem Raum hinzugefügt`);

  /* --- Nachricht-Handler --------------------------------------------- */
  socket.on("message", raw => {
    if (isBlocked(ip, hash)) return socket.close(4000, "IP blocked");

    let pkg;
    try { pkg = JSON.parse(raw); } catch { return; }

    switch (pkg.type) {
      case "join": {
        const name = (pkg.name || "").trim().slice(0, 30);
        if (!name) return;
        room.ipNames.set(ip, name);
        room.userNames.set(socket, { name, ip });

        if (room.leaveTimers.has(ip)) {
          clearTimeout(room.leaveTimers.get(ip));
          room.leaveTimers.delete(ip);
          log(`🕓 Timeout für ${ip} gelöscht`);
        } else {
          broadcastSystem(hash,
            `👋 ${name}<span class="ip-info hidden"> (${ip})</span> ist beigetreten`);
        }
        break;
      }

      case "changeName": {
        const newName = (pkg.newName || "").trim().slice(0, 30);
        if (!newName) return;
        const oldName = room.ipNames.get(ip) ?? ip;
        if (newName === oldName) return;
        room.ipNames.set(ip, newName);
        room.userNames.set(socket, { name: newName, ip });
        broadcastSystem(hash,
          `<span class="ip-info hidden"> (${ip})</span>✏️ ${oldName} heißt jetzt ${newName}`);
        break;
      }

      case "chat": {
        const user = room.userNames.get(socket) ?? { name: "?" };
        const ts   = new Date().toLocaleTimeString("de-DE",
                        { hour: "2-digit", minute: "2-digit" });
        const text = `[${ts}] ${user.name}<span class="ip-info hidden"> (${ip})</span>: ` +
                     escapeHTML(pkg.message);
        room.history.push(text);
        if (room.history.length > MAX_HISTORY) room.history.shift();
        sendToAll(room.activeClients, text);
        break;
      }
    }
  });

  /* --- Verbindungsende ----------------------------------------------- */
  socket.on("close", () => {
    log(`🔌 Verbindung von ${ip} getrennt`);
    room.activeClients.get(ip)?.delete(socket);

    if (room.activeClients.get(ip)?.size === 0) {
      const t = setTimeout(() => {
        room.activeClients.delete(ip);
        const name = room.ipNames.get(ip) ?? ip;
        broadcastSystem(hash,
          `🚪 ${name} <span class="ip-info hidden"> (${ip})</span> hat den Chat verlassen`);
        room.ipNames.delete(ip);
        room.leaveTimers.delete(ip);
        log(`🧹 ${ip} wurde nach Timeout aus dem Raum entfernt`);
      }, 3000);

      room.leaveTimers.set(ip, t);
      log(`⏳ Wartezeit für ${ip} gestartet`);
    }
  });
});

/* ----------- Server-Start -------------------------------------------- */
server.listen(PORT, () => log(`💬 Server läuft auf Port ${PORT}`));

/* ---------------------------------------------------------------------- */
/* Kleine Helfer-Funktion ----------------------------------------------- */
/*Alternative: Express.js oder body-parser Middleware verwenden aber das zu fett für unser kleines süßes Projekt*/
function collectBody(req, res, cb) {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    try { cb(JSON.parse(body || "{}")); }
    catch (e) { error(e); res.writeHead(400).end(); }
  });
}
