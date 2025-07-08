// backend/lib/utils.js
/**
 * Kleine, generische Helfer-Funktionen ohne Logging.
 */
const crypto = require("crypto");

/**
 * Erzeugt einen zufälligen 64-stelligen Hex-String.
 * @returns {string}
 */
function randHash() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Escaped spezielle HTML-Zeichen in einem String.
 * @param {string} [str=""]
 * @returns {string}
 */
function escapeHTML(str = "") {
  return String(str).replace(/[&<>"'`]/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "`": "&#96;"
    }[c])
  );
}

module.exports = { randHash, escapeHTML };
