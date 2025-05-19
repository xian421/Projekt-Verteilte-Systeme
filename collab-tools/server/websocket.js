const WebSocket = require("ws");

function initWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", function (ws) {
    ws.on("message", function (message) {
      // Broadcast an alle
      wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });
  });
}

module.exports = initWebSocket;