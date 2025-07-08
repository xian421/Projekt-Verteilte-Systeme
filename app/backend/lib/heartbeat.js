// lib/heartbeat.js
// ------------------------------------------------------------
// Heartbeat‑Utility als austauschbare Funktion
// ------------------------------------------------------------
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
