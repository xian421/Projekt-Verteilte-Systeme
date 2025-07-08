// index.js – Einstiegspunkt
const http = require("http");
const { Server } = require("ws");
const { PORT } = require("./lib/config");

const { serveStatic } = require("./lib/staticServer");
const apiRouter  = require("./lib/apiRouter");
const chatRouter = require("./lib/chatRouter");
const attachWs   = require("./lib/wsHandler");
const startHb    = require("./lib/heartbeat");

/* -------- CORS-Preflight global abfangen -------------- */
function handleOptions(req, res) {
  /* Access-Control anfragen? → immer zulassen */
  res.writeHead(204, {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  }).end();
}

/* -------- HTTP-Server & Routing-Kette ------------------- */
const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") { handleOptions(req, res); return; }
  if (apiRouter(req, res))   return;
  if (chatRouter(req, res))  return;
  serveStatic(req, res);     // Fallback: Dateien oder 404
});

/* -------- WebSocket-Server ------------------------------ */
const wss = new Server({ server });
attachWs(wss);
const hb = startHb(wss);

/* -------- Start & Shutdown ------------------------------ */
server.listen(PORT, () => console.log(`💬 Server läuft auf Port ${PORT}`));

process.on("SIGINT", () => {
  console.log("👋 SIGINT – shutdown");
  clearInterval(hb);
  wss.clients.forEach(s => s.terminate());
  server.close(() => process.exit(0));
});
