// backend/lib/httpUtils.js
/**
 * HTTP-Utilities:
 * • setSec: Security- und optional CORS-Header  
 * • sendJSON: JSON-Antwort mit Status und Sicherheitsheadern  
 * • collectJSON: Body-Parser für JSON-Requests  
 * • normPath: Normalisiert URL-Pfade  
 * • streamFile: Serviert statische Dateien mit optionalem CORS
 */
const { pipeline } = require("stream");
const fs           = require("fs");
const path         = require("path");
const { PUBLIC_DIR, MIME_TYPES } = require("./config");

/**
 * Fügt Sicherheitsheader hinzu und optional CORS-Header.
 *
 * @param {import('http').ServerResponse} res
 * @param {boolean} [allowCors=false] Wenn true, werden CORS-Header gesetzt
 */
function setSec(res, allowCors = false) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Cross-Origin-Resource-Policy",
    allowCors ? "cross-origin" : "same-origin"
  );
  if (allowCors) {
    res.setHeader("Access-Control-Allow-Origin",  "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
}

/**
 * Sendet eine JSON-Antwort mit Statuscode und setzt Sicherheits- sowie CORS-Header.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} [status=200]
 * @param {Object} [obj={}]
 * @returns {boolean} true, damit aufrufende Router erkennen, dass geantwortet wurde
 */
function sendJSON(res, status = 200, obj = {}) {
  if (res.headersSent) return true;
  setSec(res, true);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
  return true;
}

/**
 * Liest den Request-Body als JSON ein und übergibt ihn an einen Callback.
 * Bei fehlerhaftem JSON wird automatisch 400 gesendet.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}    res
 * @param {(body: any) => void}              cb Callback mit geparstem JSON-Body
 * @returns {boolean} true, damit Middleware-Pattern hakt
 */
function collectJSON(req, res, cb) {
  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    try {
      cb(JSON.parse(body || "{}"));
    } catch {
      sendJSON(res, 400, { ok: false, error: "Bad JSON" });
    }
  });
  return true;
}

/**
 * Normalisiert den URL-Pfad und entfernt doppelte Slashes und abschließendes Slash.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {string} Normalisierter Pfad, immer mit führendem Slash
 */
function normPath(req) {
  return new URL(req.url, `http://${req.headers.host}`)
    .pathname.replace(/\/{2,}/g, "/")
    .replace(/\/$/, "") || "/";
}

/**
 * Serviert eine Datei als Antwort, mit Statuscode, MIME-Type und optional CORS.
 * Bei Lesefehlern wird automatisch 500 gesendet.
 *
 * @param {import('http').ServerResponse} res
 * @param {string} absPath Absoluter Pfad zur Datei
 * @param {number} [code=200]
 * @param {string} [mime]  MIME-Typ (wird aus Extension abgeleitet, wenn nicht gesetzt)
 * @param {boolean} [allowCors=false]
 */
function streamFile(res, absPath, code = 200, mime, allowCors = false) {
  setSec(res, allowCors);
  const contentType = mime || MIME_TYPES[path.extname(absPath)] || "application/octet-stream";
  res.writeHead(code, { "Content-Type": contentType });
  pipeline(fs.createReadStream(absPath), res, err => {
    if (err && !res.headersSent) {
      res.writeHead(500).end("Fehler");
    }
  });
}

module.exports = { setSec, sendJSON, collectJSON, normPath, streamFile };
