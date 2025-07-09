// backend/lib/staticServer.js
// ------------------------------------------------------------
//  • Liefert Dateien aus PUBLIC_DIR   (Landing, 404, Assets)
//  • Fügt Security-Header hinzu
//  • Für JS/JSON/WASM optional CORS freischalten
// ------------------------------------------------------------
const fs       = require("fs");
const path     = require("path");
const { pipeline } = require("stream");
const { PUBLIC_DIR, MIME_TYPES } = require("./config");

/* ---------- Security-Header ------------------------------ */
/**
 * setSec(res, allowCors = false)
 *  – Standard-Header
 *  – Bei allowCors zusätzlich:
 *      • Access-Control-Allow-Origin: *
 *      • Cross-Origin-Resource-Policy: cross-origin
 */
function setSec(res, allowCors = false) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  if (allowCors) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  } else {
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  }
}

/* ---------- Datei streamen ------------------------------- */
function streamFile(
  res,
  filePath,
  mime = "application/octet-stream",
  code = 200,
  allowCors = false
) {
  setSec(res, allowCors);
  res.writeHead(code, { "Content-Type": mime });

  pipeline(fs.createReadStream(filePath), res, err => {
    if (err && !res.headersSent) res.writeHead(500).end("Fehler");
  });
}

/* ---------- Pfade zu Standard-Seiten --------------------- */
const LANDING = path.join(PUBLIC_DIR, "pages", "landing.html");
const ERR404  = path.join(PUBLIC_DIR, "404.html");
const ADMIN   = path.join(PUBLIC_DIR, "pages", "admin.html");

/* ---------- Haupt-Static-Router -------------------------- */
function serveStatic(req, res) {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname
                    .replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";

  /* feste Seiten */
  if (urlPath === "/admin" || urlPath === "/admin.html")
    return streamFile(res, ADMIN, "text/html");
  if (urlPath === "/dashboard" || urlPath === "/index.html")
    return streamFile(res, path.join(PUBLIC_DIR, "index.html"), "text/html");
  if (urlPath === "/")
    return streamFile(res, LANDING, "text/html");
  if (urlPath === "/404")
    return streamFile(res, ERR404, "text/html", 404);

  /* Assets */
  const rel = path.normalize(urlPath).replace(/^\/+/, "");
  const abs = path.join(PUBLIC_DIR, rel);

  /* Pfad-Sicherheit + 404 */
  if (!abs.startsWith(PUBLIC_DIR)) { res.writeHead(403).end(); return true; }
  if (!fs.existsSync(abs))         { streamFile(res, ERR404, "text/html", 404); return true; }

  const ext       = path.extname(abs);
  const mime      = MIME_TYPES[ext] || "application/octet-stream";
  const needsCors = [".js", ".mjs", ".json", ".wasm", ".html", ".css"].includes(ext);

  streamFile(res, abs, mime, 200, needsCors);
  return true;
}

/* ---------- kleine Aliase für andere Module -------------- */
const serveLanding = res => streamFile(res, LANDING, "text/html");
const serve404     = res => streamFile(res, ERR404, "text/html", 404);

module.exports = { serveStatic, serveLanding, serve404, setSec };
