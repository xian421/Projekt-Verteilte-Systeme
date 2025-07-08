// backend/lib/heartbeat.js
/**
 * Startet einen Heartbeat-Intervall, der alle WebSocket-Clients pingt
 * und inaktive Verbindungen terminiert.
 *
 * @param {import('ws').Server} wss      WebSocket-Server-Instanz
 * @param {number}            [interval=30000] Intervall in Millisekunden
 * @returns {NodeJS.Timeout} Intervall-Timer, damit bei Bedarf gestoppt werden kann
 */
const logger = require("./logger");

function startHeartbeat(wss, interval = 30_000) {
  return setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        logger.warn("Client stale – terminating");
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, interval);
}

module.exports = startHeartbeat;
