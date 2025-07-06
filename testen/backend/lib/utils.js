// lib/utils.js
const crypto = require("crypto");

/* Zufälliger 64-stelliger Hash (Raum-ID) */
function randHash() {
  return crypto.randomBytes(32).toString("hex");
}

/* Sehr simples HTML-Escape, um XSS zu vermeiden */
function escapeHTML(str = "") {
  return String(str).replace(/[&<>"'`]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    "\"":"&quot;","'":"&#39;","`":"&#96;"
  }[c]));
}

/* Zeitstempel-Logger */
function log(...args) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}]`, ...args);
}

module.exports = { randHash, escapeHTML, log };
