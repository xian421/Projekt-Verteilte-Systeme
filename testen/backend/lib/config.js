// lib/config.js
// Zentrale Konfiguration des Chat-Servers
// -- Änderungen an Limits oder Ports NUR hier! --
const path = require("path");

module.exports = {
  /* Basis */
  PORT: process.env.PORT || 4441,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "keule",

  /* Limits & Größen */
  MAX_HISTORY: 100,
  RATE_LIMIT_COUNT: 20,      // Nachrichten
  RATE_LIMIT_WINDOW: 10_000, // in ms
  BACKPRESSURE_LIMIT: 1 * 1024 * 1024, // 1 MiB

  /* Regex & Hash-Länge */
  HASH_RE: /^[a-f0-9]{64}$/i,

  /* WebSocket-Close Codes */
  CLOSE_CODES: {
    BLOCKED: 4000,
    DUPLICATE: 4001,
    UNKNOWN_ROOM: 4002,
    INVALID_PACKET: 4003,
    RATE_LIMIT: 4004,
    BACKPRESSURE: 4005,
  },

  /* MIME-Typen für statische Dateien */
  MIME_TYPES: {
    ".html": "text/html",
    ".js":   "application/javascript",
    ".json": "application/json",
    ".css":  "text/css",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".svg":  "image/svg+xml",
    ".woff": "font/woff",
    ".woff2":"font/woff2",
  },

  /* Pfad zur Webroot */
  PUBLIC_DIR: path.resolve(__dirname, "..", ".."), // zurück zu /testen/
};
