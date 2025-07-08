// backend/lib/roomStore.js
/**
 * Zentraler In-Memory-Store für Chat-Räume und zugehörige Hilfsfunktionen.
 */
const { MAX_HISTORY, CLOSE_CODES, BACKPRESSURE_LIMIT } = require("./config");
const logger         = require("./logger");

// Metadaten für alle Räume: hash → { name, blocklist }
const roomsMeta = new Map();

// Laufzeit-Daten für geöffnete Räume: hash → { activeClients, … }
const liveRooms = new Map();

/**
 * Findet die Metadaten zu einem Raum-Hash.
 * @param {string} hash
 * @returns {{name: string, blocklist: string[]}|undefined}
 */
function findRoom(hash) {
  return roomsMeta.get(hash);
}

/**
 * Initialisiert oder liefert das Laufzeit-Objekt für einen Raum.
 * @param {string} hash
 * @returns {{
 *   activeClients: Map<string,Set<import('ws').WebSocket>>,
 *   userNames: WeakMap<import('ws').WebSocket,{name:string,ip:string}>,
 *   ipNames: Map<string,string>,
 *   leaveTimers: Map<string,NodeJS.Timeout>,
 *   history: string[],
 *   blocklist: string[]
 * }}
 */
function ensureLiveRoom(hash) {
  if (!liveRooms.has(hash)) {
    liveRooms.set(hash, {
      activeClients: new Map(),
      userNames:     new WeakMap(),
      ipNames:       new Map(),
      leaveTimers:   new Map(),
      history:       [],
      blocklist:     findRoom(hash)?.blocklist || []
    });
  }
  return liveRooms.get(hash);
}

const IP_SPAN_RE = /<span class="ip-info[^>]*>.*?<\/span>/g;

/**
 * Sendet eine Nachricht nur an Admin-Sockets, ohne sie in die History aufzunehmen.
 * @param {Map<string,Set<import('ws').WebSocket>>} clientMap
 * @param {string} payload
 */
function sendToAdmins(clientMap, payload) {
  clientMap.forEach(set => {
    set.forEach(sock => {
      if (!sock.isAdmin) return;
      if (sock.readyState !== sock.OPEN) return;
      if (sock.bufferedAmount > BACKPRESSURE_LIMIT) {
        sock.close(CLOSE_CODES.BACKPRESSURE, "Backpressure");
        return;
      }
      sock.send(payload);
    });
  });
}

/**
 * Entfernt alle IP-Info-Spans aus einem HTML- oder JSON-String.
 * @param {string|any} payload
 * @returns {string|any}
 */
function stripIpSpans(payload) {
  if (typeof payload !== "string") return payload;

  if (payload.startsWith("{")) {
    try {
      const obj = JSON.parse(payload);
      if (typeof obj.text === "string") {
        obj.text = obj.text.replace(IP_SPAN_RE, "");
      }
      return JSON.stringify(obj);
    } catch {
      // Kein JSON → weiter zu Plain-HTML
    }
  }
  return payload.replace(IP_SPAN_RE, "");
}

/**
 * Broadcast an alle Sockets im Raum; automatische IP-Filterung für Nicht-Admins.
 * @param {Map<string,Set<import('ws').WebSocket>>} clientMap
 * @param {string} payload
 */
function sendToAll(clientMap, payload) {
  clientMap.forEach(set => {
    set.forEach(socket => {
      if (socket.bufferedAmount > BACKPRESSURE_LIMIT) {
        socket.close(CLOSE_CODES.BACKPRESSURE, "Backpressure");
        return;
      }
      if (socket.readyState !== socket.OPEN) return;

      const out = socket.isAdmin ? payload : stripIpSpans(payload);
      socket.send(out);
    });
  });
}

/**
 * Fügt eine System-Nachricht in die History ein und broadcastet sie.
 * @param {string} hash
 * @param {string} text
 */
function broadcastSystem(hash, text) {
  const room = liveRooms.get(hash);
  if (!room) return;
  const payload = JSON.stringify({ type: "system", text });
  room.history.push(payload);
  if (room.history.length > MAX_HISTORY) {
    room.history.shift();
  }
  sendToAll(room.activeClients, payload);
}

/**
 * Bannt eine IP manuell oder automatisch und informiert Admins.
 * @param {string} hash
 * @param {string} ip
 * @param {{auto: boolean}} [options]
 */
function banIp(hash, ip, { auto = false } = {}) {
  const meta = findRoom(hash);
  if (!meta) return;

  if (!meta.blocklist.includes(ip)) {
    meta.blocklist.push(ip);
  }

  const room = ensureLiveRoom(hash);
  room.blocklist = meta.blocklist;

  if (room.activeClients.has(ip)) {
    room.activeClients.get(ip).forEach(sock =>
      sock.close(CLOSE_CODES.BLOCKED, "IP auto-banned")
    );
  }

  const msg = `<span class="ip-info hidden">🚫 ${ip} ${
    auto ? "automatisch gebannt (Spam)" : "manuell gebannt"
  }</span>`;

  const payloadObj = { type: "system", text: msg, adminOnly: true };
  const payload    = JSON.stringify(payloadObj);

  // In History behalten
  room.history.push(payload);
  if (room.history.length > MAX_HISTORY) {
    room.history.shift();
  }

  // Nur Admins benachrichtigen
  sendToAdmins(room.activeClients, payload);

  logger.info(`🚫 ${ip} ${auto ? "auto-ban" : "manual ban"}`);
}

module.exports = {
  roomsMeta,
  liveRooms,
  findRoom,
  ensureLiveRoom,
  sendToAdmins,
  sendToAll,
  broadcastSystem,
  banIp,
  stripIpSpans
};
