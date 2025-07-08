// backend/lib/staticServer.js
/**
 * ServeStatic: Liefert Landing-, Admin- und Asset-Dateien aus PUBLIC_DIR,
 * sowie 404- und 403-Antworten für ungültige Pfade.
 */
const fs   = require("fs");
const path = require("path");
const { PUBLIC_DIR }      = require("./config");
const { setSec, streamFile, normPath } = require("./httpUtils");

const LANDING = path.join(PUBLIC_DIR, "pages", "landing.html");
const ADMIN   = path.join(PUBLIC_DIR, "pages", "admin.html");
const INDEX   = path.join(PUBLIC_DIR, "index.html");
const ERR404  = path.join(PUBLIC_DIR, "404.html");

/**
 * Serviert statische Dateien oder Standardseiten.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}    res
 * @returns {boolean} true, falls eine Datei ausgeliefert wurde
 */
function serveStatic(req, res) {
  const urlPath = normPath(req);

  // Feste Seiten
  if (urlPath === "/"             ) { streamFile(res, LANDING, 200, "text/html"); return true; }
  if (urlPath === "/admin"        ) { streamFile(res, ADMIN,   200, "text/html"); return true; }
  if (urlPath === "/admin.html"   ) { streamFile(res, ADMIN,   200, "text/html"); return true; }
  if (urlPath === "/dashboard"    ) { streamFile(res, INDEX,   200, "text/html"); return true; }
  if (urlPath === "/index.html"   ) { streamFile(res, INDEX,   200, "text/html"); return true; }
  if (urlPath === "/404"          ) { streamFile(res, ERR404,  404, "text/html"); return true; }

  // Assets aus PUBLIC_DIR
  const rel = path.normalize(urlPath).replace(/^\/+/, "");
  const abs = path.join(PUBLIC_DIR, rel);

  // Pfadsicherheit
  if (!abs.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return true;
  }

  // Existenz prüfen
  if (!fs.existsSync(abs)) {
    streamFile(res, ERR404, 404, "text/html");
    return true;
  }

  // CORS nur für typische Web-Assets
  const ext = path.extname(abs);
  const needsCors = [".js", ".json", ".css", ".html", ".mjs", ".wasm"].includes(ext);
  streamFile(res, abs, 200, undefined, needsCors);
  return true;
}

/** Kurzform für Landing-Page */
const serveLanding = (res) => streamFile(res, LANDING, 200, "text/html");
/** Kurzform für 404-Seite */
const serve404    = (res) => streamFile(res, ERR404, 404, "text/html");

module.exports = { serveStatic, serveLanding, serve404, setSec };
