// backend/lib/staticServer.js
// ------------------------------------------------------------
//  • Liefert Landing, Admin, Assets & 404 aus PUBLIC_DIR
//  • Nutzt gemeinsame Utilities aus httpUtils.js
// ------------------------------------------------------------
const fs   = require("fs");
const path = require("path");

const { PUBLIC_DIR } = require("./config");
const { setSec, streamFile, normPath } = require("./httpUtils");

/* ---------- Pfade zu Standard‑Seiten --------------------- */
const LANDING = path.join(PUBLIC_DIR, "pages", "landing.html");
const ERR404  = path.join(PUBLIC_DIR, "404.html");
const ADMIN   = path.join(PUBLIC_DIR, "pages", "admin.html");

/* ---------- Haupt‑Static‑Router -------------------------- */
function serveStatic(req, res) {
  const urlPath = normPath(req);

  /* feste Seiten */
  if (urlPath === "/admin" || urlPath === "/admin.html")
    return streamFile(res, ADMIN, 200, "text/html");
  if (urlPath === "/dashboard" || urlPath === "/index.html")
    return streamFile(res, path.join(PUBLIC_DIR, "index.html"), 200, "text/html");
  if (urlPath === "/")
    return streamFile(res, LANDING, 200, "text/html");
  if (urlPath === "/404")
    return streamFile(res, ERR404, 404, "text/html");

  /* Assets */
  const rel = path.normalize(urlPath).replace(/^\/+/, "");
  const abs = path.join(PUBLIC_DIR, rel);

  /* Pfad‑Sicherheit + 404 */
  if (!abs.startsWith(PUBLIC_DIR)) { res.writeHead(403).end(); return true; }
  if (!fs.existsSync(abs))         { streamFile(res, ERR404, 404, "text/html"); return true; }

  /* CORS nur für typische Web‑Assets */
  const needsCors = [".js",".mjs",".json",".wasm",".html",".css"].includes(path.extname(abs));
  streamFile(res, abs, 200, undefined, needsCors);
  return true;
}

/* ---------- Aliase für andere Module --------------------- */
const serveLanding = res => streamFile(res, LANDING, 200, "text/html");
const serve404     = res => streamFile(res, ERR404, 404, "text/html");

module.exports = { serveStatic, serveLanding, serve404, setSec };
