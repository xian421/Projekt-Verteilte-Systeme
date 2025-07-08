// backend/lib/config.js
/**
 * Zentrale Konfiguration des Chat-Servers.
 * Hier werden Ports, Pfade und Limits festgelegt.
 */
const crypto = require("crypto");
const path   = require("path");

// Admin-Credentials
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "keule";
const ADMIN_TOKEN    = crypto
  .createHash("sha256")
  .update(ADMIN_PASSWORD)
  .digest("hex");

// Verzeichnis-Pfade
const ROOT_DIR     = path.join(__dirname, "..", "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const PUBLIC_DIR   =
  process.env.NODE_ENV === "production"
    ? path.join(FRONTEND_DIR, "dist")
    : FRONTEND_DIR;

module.exports = {
  // Server-Grundeinstellungen
  PORT: Number(process.env.PORT) || 4441,
  ADMIN_PASSWORD,
  ADMIN_TOKEN,

  // Größen- und Zeitlimits
  MAX_HISTORY:       100,
  RATE_LIMIT_COUNT:  5,       // Nachrichten pro Window
  RATE_LIMIT_WINDOW: 10_000,  // ms
  BACKPRESSURE_LIMIT: 1 * 1024 * 1024, // 1 MiB

  // Validierungs-Regeln
  HASH_RE: /^[a-f0-9]{64}$/i,

  // WebSocket-Close-Codes
  CLOSE_CODES: {
    BLOCKED:      4000,
    DUPLICATE:    4001,
    UNKNOWN_ROOM: 4002,
    INVALID_PACKET: 4003,
    RATE_LIMIT:   4004,
    BACKPRESSURE: 4005,
    ROOM_DELETED: 4006,
  },

  // MIME-Typen für statische Dateien
  MIME_TYPES: {
    ".html": "text/html; charset=utf-8",
    ".js":   "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".svg":  "image/svg+xml",
    ".woff": "font/woff",
    ".woff2":"font/woff2",
    ".webp": "image/webp"
  },

  // Öffentlicher Webroot
  PUBLIC_DIR,
  ROOT_DIR,
};
