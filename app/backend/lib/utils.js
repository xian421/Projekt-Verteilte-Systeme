// lib/utils.js
// --------------------
// Kleine, generische Helfer – **ohne** Logging!

const crypto = require("crypto");

/* Zufälliger 64‑stelliger Hash */
const randHash = () => crypto.randomBytes(32).toString("hex");

/* Minimales HTML‑Escape */
function escapeHTML(str = "") {
  return String(str).replace(/[&<>"'`]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    "\"":"&quot;","'":"&#39;","`":"&#96;"
  }[c]));
}

module.exports = { randHash, escapeHTML };
