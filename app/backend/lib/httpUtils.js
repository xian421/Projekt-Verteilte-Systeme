// lib/httpUtils.js
// ----------------
// Gemeinsame HTTP‑Utilities: Security‑Header, JSON‑Antwort, Body‑Parser,
// URL‑Normalisierung.

const { pipeline } = require("stream");
const fs   = require("fs");
const path = require("path");
const { PUBLIC_DIR, MIME_TYPES } = require("./config");

/* ---------- Security‑Header ---------------------------- */
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
    res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  }
}

/* ---------- JSON‑Antwort ------------------------------- */
function sendJSON(res, status = 200, obj = {}) {
  if (res.headersSent) return true;
  setSec(res, true);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
  return true;
}

/* ---------- Body einlesen ------------------------------ */
function collectJSON(req, res, cb) {
  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    try { cb(JSON.parse(body || "{}")); }
    catch { sendJSON(res, 400, { ok:false, error:"Bad JSON" }); }
  });
  return true;
}

/* ---------- Hilfs­funktion: URL–Pfad -------------------- */
function normPath(req) {
  return new URL(req.url, `http://${req.headers.host}`)
           .pathname.replace(/\/{2,}/g, "/")
           .replace(/\/$/, "") || "/";
}

/* ---------- Datei streamen (für staticServer u.a.) ------ */
function streamFile(
  res, absPath,
  code = 200,
  mime = MIME_TYPES[path.extname(absPath)] || "application/octet-stream",
  allowCors = false
) {
  setSec(res, allowCors);
  res.writeHead(code, { "Content-Type": mime });
  pipeline(fs.createReadStream(absPath), res, err => {
    if (err && !res.headersSent) res.writeHead(500).end("Fehler");
  });
}

module.exports = { setSec, sendJSON, collectJSON, normPath, streamFile };
