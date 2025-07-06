// lib/staticServer.js
// ------------------------------------------------------------
// Liefert statische Dateien per Stream (Sprint D) und stellt
// Hilfsfunktionen für Landing-Page und 404-Seite bereit.
// ------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { PUBLIC_DIR, MIME_TYPES } = require("./config");

// Sicherheits-Header für alle (!) statischen Antworten
function setSec(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
}

// Kernfunktion: Datei per Stream ausliefern
function streamFile(res, filePath, mimeType = "application/octet-stream", code = 200) {
  const stream = fs.createReadStream(filePath);
  setSec(res);
  res.writeHead(code, { "Content-Type": mimeType });

  pipeline(stream, res, err => {
    if (err && !res.headersSent) {
      res.writeHead(500).end("Fehler");
    }
  });
}

/* Kleine Convenience-Wrapper */
const LANDING = path.join(PUBLIC_DIR, "landing.html");
const ERR404  = path.join(PUBLIC_DIR, "404.html");

function serveLanding(res) { streamFile(res, LANDING, "text/html"); }
function serve404(res)     { streamFile(res, ERR404, "text/html", 404); }

/**
 * serveStatic(req, res)
 * Gibt true zurück, wenn eine Datei ausgeliefert (oder 404 gezeigt) wurde;
 * sonst false → dann kann der aufrufende Router noch weitermachen.
 */
function serveStatic(req, res) {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname
                    .replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";

  // absolute & sichere Pfadauflösung
  const safe = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!safe.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();         // Directory-Traversal-Guard
    return true;
  }

  // falls Root-Verzeichnis selbst, nichts machen (Landing übernimmt)
  if (safe === PUBLIC_DIR) return false;

  // Prüfen, ob Datei existiert
  try {
    fs.accessSync(safe, fs.constants.R_OK);
  } catch {
    serve404(res);
    return true;
  }

  const mime = MIME_TYPES[path.extname(safe)] || "application/octet-stream";
  streamFile(res, safe, mime);
  return true;
}

module.exports = {
  streamFile,
  serveLanding,
  serve404,
  serveStatic,
  setSec // wird evtl. vom chatRouter genutzt
};
