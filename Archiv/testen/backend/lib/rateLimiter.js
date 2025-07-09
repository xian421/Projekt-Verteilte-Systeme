// lib/rateLimiter.js
// ------------------------------------------------------------
// Einfaches Sliding-Window-Rate-Limiting pro IP
// ------------------------------------------------------------
const { RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW } = require("./config");

const state = new Map(); // ip → {count, start}

/**
 * withinRateLimit(ip) → boolean
 *  - true  ... darf senden
 *  - false ... Limit überschritten
 */
function withinRateLimit(ip) {
  const now = Date.now();
  const rec = state.get(ip) || { count: 0, start: now };

  if (now - rec.start > RATE_LIMIT_WINDOW) {
    rec.count = 0; rec.start = now;   // neues Zeitfenster
  }
  rec.count += 1;
  state.set(ip, rec);
  return rec.count <= RATE_LIMIT_COUNT;
}

module.exports = { withinRateLimit };
