// lib/heartbeat.js
const HEARTBEAT_INTERVAL = 30_000; // 30 s

function startHeartbeat(wss) {
  return setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);
}

module.exports = startHeartbeat;
