// backend/lib/wsHandler.js
/**
 * WebSocket-Handler: Verbindungsaufbau, Nachrichten, Rate-Limit, Auto-Ban.
 */
const { HASH_RE, CLOSE_CODES } = require("./config");
const {
  findRoom,
  ensureLiveRoom,
  sendToAll,
  broadcastSystem,
  banIp,
  stripIpSpans
} = require("./roomStore");
const rateLimiter = require("./rateLimiter");
const logger      = require("./logger");
const { escapeHTML } = require("./utils");

/**
 * Prüft, ob eingehendes Paket validiert werden kann.
 * @param {any} pkg
 * @returns {boolean}
 */
function isValidPacket(pkg) {
  if (!pkg || typeof pkg !== "object") return false;
  switch (pkg.type) {
    case "join":
      return typeof pkg.name === "string" && pkg.name.trim();
    case "changeName":
      return typeof pkg.newName === "string" && pkg.newName.trim();
    case "chat":
      return typeof pkg.message === "string" && pkg.message.trim();
    default:
      return false;
  }
}

/**
 * Hängt dem WebSocket-Server Connection- und Message-Handler an.
 * @param {import('ws').Server} wss
 */
function attachWss(wss) {
  // Heartbeat-Mechanismus
  wss.on("connection", (socket, req) => {
    socket.isAlive = true;
    socket.on("pong", () => (socket.isAlive = true));

    // Extrahiere Raum-Hash & Client-IP
    const hash = (req.url || "").replace(/^\/+/, "").toLowerCase();
    let ip     = (req.headers["x-forwarded-for"] || req.socket.remoteAddress)
      .replace(/^.*:/, "");
    if (ip.startsWith("ffff:")) ip = ip.slice(5);
    ip = ip.replace(/^f{4}:0{1,4}:/i, "");

    // Validierung: Raum existiert?
    if (!HASH_RE.test(hash) || !findRoom(hash)) {
      return socket.close(CLOSE_CODES.UNKNOWN_ROOM, "Unknown room");
    }
    // IP gebannt?
    const room = ensureLiveRoom(hash);
    if (room.blocklist.includes(ip)) {
      return socket.close(CLOSE_CODES.BLOCKED, "IP blocked");
    }
    // Duplicate Connection?
    if (room.activeClients.has(ip) && !room.leaveTimers.has(ip)) {
      return socket.close(CLOSE_CODES.DUPLICATE, "Duplicate connection");
    }

    // Client registrieren
    (room.activeClients.get(ip) ?? room.activeClients.set(ip, new Set()).get(ip))
      .add(socket);

    // Nachricht-Handler
    socket.on("message", (raw) => {
      let pkg;
      try {
        pkg = JSON.parse(raw);
      } catch {
        return socket.close(CLOSE_CODES.INVALID_PACKET, "Invalid JSON");
      }
      if (!isValidPacket(pkg)) {
        return socket.close(CLOSE_CODES.INVALID_PACKET, "Invalid packet");
      }

      // Rate-Limit & Auto-Ban
      if (!rateLimiter.allowed(ip)) {
        banIp(hash, ip, { auto: true });
        return socket.close(CLOSE_CODES.RATE_LIMIT, "Rate limit exceeded");
      }
      if (room.blocklist.includes(ip)) {
        return socket.close(CLOSE_CODES.BLOCKED, "IP blocked");
      }

      // Paket-Typ verarbeiten
      switch (pkg.type) {
        case "join": {
          const name    = pkg.name.trim().slice(0, 30);
          const isAdmin = pkg.token === require("./config").ADMIN_TOKEN;
          room.ipNames.set(ip, name);
          room.userNames.set(socket, { name, ip });
          socket.isAdmin = isAdmin;

          // Verlauf nachliefern
          room.history.forEach((msg) => {
            if (socket.isAdmin) {
              socket.send(msg);
            } else {
              try {
                const obj = JSON.parse(msg);
                if (!obj.adminOnly) socket.send(stripIpSpans(msg));
              } catch {
                socket.send(stripIpSpans(msg));
              }
            }
          });

          // Begrüßung oder Wiederbeitritt
          if (room.leaveTimers.has(ip)) {
            clearTimeout(room.leaveTimers.get(ip));
            room.leaveTimers.delete(ip);
          } else {
            broadcastSystem(hash, `👋 ${escapeHTML(name)} ist beigetreten`);
          }
          break;
        }
        case "changeName": {
          const newName = pkg.newName.trim().slice(0, 30);
          const oldName = room.ipNames.get(ip) || ip;
          if (newName !== oldName) {
            room.ipNames.set(ip, newName);
            room.userNames.set(socket, { name: newName, ip });
            broadcastSystem(
              hash,
              `${escapeHTML(oldName)} heißt jetzt ${escapeHTML(newName)}`
            );
          }
          break;
        }
        case "chat": {
          const user = room.userNames.get(socket) || { name: room.ipNames.get(ip) || "?" };
          const ts   = new Date().toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit"
          });
          const text = `[${ts}] ${escapeHTML(user.name)}: ${escapeHTML(pkg.message)}`;
          room.history.push(text);
          if (room.history.length > 100) room.history.shift();
          sendToAll(room.activeClients, text);
          break;
        }
      }
    });

    // Close-Handler
    socket.on("close", () => {
      room.activeClients.get(ip)?.delete(socket);
      logger.info(`Socket close (${ip})`);
      if (room.activeClients.get(ip)?.size === 0) {
        const timer = setTimeout(() => {
          room.activeClients.delete(ip);
          broadcastSystem(hash, `🚪 ${escapeHTML(room.ipNames.get(ip) || ip)} hat den Chat verlassen`);
          room.ipNames.delete(ip);
          room.leaveTimers.delete(ip);
        }, 3000);
        room.leaveTimers.set(ip, timer);
      }
    });
  });
}

module.exports = attachWss;
