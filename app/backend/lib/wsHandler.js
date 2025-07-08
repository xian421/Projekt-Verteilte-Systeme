// lib/wsHandler.js
// ------------------------------------------------------------
// Kapselt alle WebSocket-Operationen:
//  • Verbindung aufnehmen
//  • Nachrichten verarbeiten (Join, Chat, Namensänderung)
//  • Rate-Limit + Auto-Ban
//  • Backpressure-Guard geschieht in roomStore.sendToAll
// ------------------------------------------------------------
const { Server } = require("ws");
const {
  HASH_RE, CLOSE_CODES
} = require("./config");
const {
  findRoom, ensureLiveRoom, sendToAll,
  broadcastSystem, banIp, stripIpSpans
} = require("./roomStore");
const rateLimiter = require("./rateLimiter");
const logger      = require("./logger");
const { escapeHTML } = require("./utils");

/* ---------------- Paket-Validation ----------------------- */
function isValidPacket(pkg) {
  if (!pkg || typeof pkg !== "object") return false;
  switch (pkg.type) {
    case "join":       return typeof pkg.name    === "string" && pkg.name.trim();
    case "changeName": return typeof pkg.newName === "string" && pkg.newName.trim();
    case "chat":       return typeof pkg.message === "string" && pkg.message.trim();
    default:           return false;
  }
}

/* ---------------- Haupt-Funktion ------------------------- */
/**
 * attachWss(wss)
 *   - wss: Instanz von new Server({ server })
 *   - Fügt 'connection' + Heartbeat-Handling hinzu
 */
function attachWss(wss) {
  wss.on("connection", (socket, req) => {
    // 1. Heartbeat-Flag setzen
    socket.isAlive = true;
    socket.on("pong", () => (socket.isAlive = true));

    // 2. Hash & IP ermitteln
    const hash = (req.url || "").replace(/^\/+/, "").toLowerCase();
    let ip     = (req.headers["x-forwarded-for"] || req.socket.remoteAddress)
                   .replace(/^.*:/, "");
    if (ip.startsWith("ffff:")) ip = ip.slice(5);
    ip = ip.replace(/^f{4}:0{1,4}:/i, "");

    // 3. Grundprüfungen
    if (!HASH_RE.test(hash) || !findRoom(hash)) {
      return socket.close(CLOSE_CODES.UNKNOWN_ROOM, "Unknown room");
    }
    if (ensureLiveRoom(hash).blocklist.includes(ip)) {
      return socket.close(CLOSE_CODES.BLOCKED, "IP blocked");
    }

    const room = ensureLiveRoom(hash);
    if (room.activeClients.has(ip) && !room.leaveTimers.has(ip)) {
      return socket.close(CLOSE_CODES.DUPLICATE, "Duplicate connection");
    }

    // 4. Client registrieren  – History NICHT mehr hier senden
    (room.activeClients.get(ip) ?? room.activeClients.set(ip, new Set()).get(ip))
      .add(socket);

    /* ---------- Nachricht-Handler ----------------------- */
    socket.on("message", raw => {
      let pkg;
      try { pkg = JSON.parse(raw); } catch {
        return socket.close(CLOSE_CODES.INVALID_PACKET, "Invalid JSON");
      }
      if (!isValidPacket(pkg))
        return socket.close(CLOSE_CODES.INVALID_PACKET, "Invalid packet");

      // Rate-Limit + Auto-Ban
      if (!rateLimiter.allowed(ip)) {
        banIp(hash, ip, { auto: true });        // ← Flag setzen
        return socket.close(CLOSE_CODES.RATE_LIMIT, "Rate limit exceeded");
      }
      if (room.blocklist.includes(ip))
        return socket.close(CLOSE_CODES.BLOCKED, "IP blocked");

      /* --- Switch je Packet-Type ----------------------- */
      switch (pkg.type) {
        case "join": {
          const name = pkg.name.trim().slice(0, 30);
          const isAdmin = pkg.token === require("./config").ADMIN_TOKEN;
          room.ipNames.set(ip, name);
          room.userNames.set(socket, { name, ip });
          socket.isAdmin = isAdmin;

          // ➜ Verlauf jetzt nachreichen
          room.history.forEach(msg => {
            if (socket.isAdmin) {            // Admin sieht alles
              socket.send(msg); return;
            }
            try {
              const obj = JSON.parse(msg);
              if (obj.adminOnly) return;     // überspringen
            } catch {/* plain HTML – durchlassen */}

            socket.send(stripIpSpans(msg));  // IPs raus für normale Nutzer
          });

          if (room.leaveTimers.has(ip)) {
            clearTimeout(room.leaveTimers.get(ip));
            room.leaveTimers.delete(ip);
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
          const user = room.userNames.get(socket) || { name: room.ipNames.get(ip) || "?" };
          const ts = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
          const text = `[${ts}] ${escapeHTML(user.name)}<span class="ip-info hidden"> (${ip})</span>: `
                     + escapeHTML(pkg.message);
          room.history.push(text);
          if (room.history.length > 100) room.history.shift();
          sendToAll(room.activeClients, text);
          break;
        }
      }
    });

    /* ---------- Verbindungsende ------------------------- */
    socket.on("close", () => {
      logger.info(`Socket close (${ip})`);
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
}

module.exports = attachWss;
