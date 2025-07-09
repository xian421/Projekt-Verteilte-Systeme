// lib/roomStore.js
// ------------------------------------------------------------
// Zentraler In-Memory-Store für Räume + Hilfsfunktionen
// ------------------------------------------------------------
const { MAX_HISTORY, CLOSE_CODES, BACKPRESSURE_LIMIT } = require("./config");
const { escapeHTML, log } = require("./utils");

/* --------------------------------------------------
   Metadaten + Laufzeit-Strukturen
-------------------------------------------------- */
const roomsMeta = new Map();   // hash → { name, blocklist }
const liveRooms = new Map();   // hash → runtime-Objekt

const findRoom = hash => roomsMeta.get(hash);

function ensureLiveRoom(hash) {
  if (!liveRooms.has(hash)) {
    liveRooms.set(hash, {
      activeClients : new Map(),   // ip → Set<socket>
      userNames     : new WeakMap(),
      ipNames       : new Map(),
      leaveTimers   : new Map(),
      history       : [],
      blocklist     : findRoom(hash)?.blocklist || []
    });
  }
  return liveRooms.get(hash);
}

/* --------------------------------------------------
   Messaging-Helpers
-------------------------------------------------- */
const IP_SPAN_RE = /<span class="ip-info[^>]*>.*?<\/span>/g;

/* entfernt IP-Spans – funktioniert für HTML **und** JSON-Strings */
function stripIpSpans(payload) {
  if (typeof payload !== "string") return payload;

  /* Fall 1: JSON‐String mit {text:"…"} */
  if (payload.startsWith("{")) {
    try {
      const obj = JSON.parse(payload);
      if (typeof obj.text === "string") obj.text = obj.text.replace(IP_SPAN_RE, "");
      return JSON.stringify(obj);
    } catch { /* Parsing fehlgeschlagen – weiter zu Plain-HTML */ }
  }

  /* Fall 2: Plain-HTML */
  return payload.replace(IP_SPAN_RE, "");
}

/* — Broadcast an alle Sockets im Raum — */
function sendToAll(clientMap, payload) {
  clientMap.forEach(set => set.forEach(socket => {
    if (socket.bufferedAmount > BACKPRESSURE_LIMIT) {
      socket.close(CLOSE_CODES.BACKPRESSURE, "Backpressure"); return;
    }
    if (socket.readyState !== socket.OPEN) return;

    const out = socket.isAdmin ? payload : stripIpSpans(payload);
    socket.send(out);
  }));
}

/* System-Nachrichten */
function broadcastSystem(hash, text) {
  const room = liveRooms.get(hash); if (!room) return;
  const payload = JSON.stringify({ type: "system", text });
  room.history.push(payload);
  if (room.history.length > MAX_HISTORY) room.history.shift();
  sendToAll(room.activeClients, payload);
}

/* --------------------------------------------------
   IP-Bann & Blocklisten-Logik
-------------------------------------------------- */
function banIp(hash, ip) {
  const meta = findRoom(hash); if (!meta) return;
  if (!meta.blocklist.includes(ip)) meta.blocklist.push(ip);

  const room = ensureLiveRoom(hash);
  room.blocklist = meta.blocklist;

  if (room.activeClients.has(ip)) {
    room.activeClients.get(ip)
        .forEach(sock => sock.close(CLOSE_CODES.BLOCKED, "IP auto-banned"));
    room.activeClients.delete(ip);
  }
  broadcastSystem(hash,
    `<span class="ip-info hidden">🚫 ${ip} automatisch gebannt (Spam)</span>`);
  log(`🚫 ${ip} auto-ban wegen Spam`);
}

/* --------------------------------------------------
   Export
-------------------------------------------------- */
module.exports = {
  roomsMeta,
  liveRooms,
  findRoom,
  ensureLiveRoom,
  sendToAll,
  broadcastSystem,
  banIp
};
