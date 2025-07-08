// backend/index.js – Einstiegspunkt
// ---------------------------------
const http = require("http");
const { Server } = require("ws");
const { PORT }   = require("./lib/config");

const { serveStatic } = require("./lib/staticServer");
const apiRouter  = require("./lib/apiRouter");
const chatRouter = require("./lib/chatRouter");
const attachWs   = require("./lib/wsHandler");
const startHeartbeat = require("./lib/heartbeat");
const logger         = require("./lib/logger");
/* -------- CORS‑Preflight global ------------------------- */
function handleOptions(req, res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age":       "86400"
  }).end();
}

/* -------- HTTP‑Server mit Routing‑Kette ----------------- */
const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return handleOptions(req, res);

  // 1) API
  if (apiRouter(req, res)) return;
  if (res.headersSent)     return;          // ← schon beantwortet

  // 2) Chat‑Routing (HTML‑Shell)
  if (chatRouter(req, res)) return;
  if (res.headersSent)     return;

  // 3) Statische Dateien oder 404
  serveStatic(req, res);
});

/* -------- WebSocket‑Server ------------------------------ */
const wss = new Server({ server });
attachWs(wss);
const hb = startHeartbeat(wss);

/* -------- Start & Graceful Shutdown --------------------- */
server.listen(PORT, () => logger.info(`💬 Server läuft auf Port ${PORT}`));

process.on("SIGINT", () => {
  logger.info("👋 SIGINT – shutdown");
  clearInterval(hb);
  wss.clients.forEach(s => s.terminate());
  server.close(() => process.exit(0));
});
