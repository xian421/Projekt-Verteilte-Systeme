// lib/rateLimiter.js
// ------------------------------------------------------------
// Konfigurierbares Sliding‑Window‑Rate‑Limiter‑Objekt
// ------------------------------------------------------------
const { RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW } = require("./config");
const logger = require("./logger");

class RateLimiter {
  constructor(maxCount, windowMs) {
    this.MAX = maxCount;
    this.WIN = windowMs;
    this.state = new Map();         // ip → {count, start}
  }

  allowed(ip) {
    const now  = Date.now();
    const rec  = this.state.get(ip) || { count: 0, start: now };

    if (now - rec.start > this.WIN) { rec.count = 0; rec.start = now; }
    rec.count += 1;
    this.state.set(ip, rec);

    const ok = rec.count <= this.MAX;
    if (!ok) logger.warn(`Rate‑Limit: ${ip} blocked (${rec.count}/${this.MAX})`);
    return ok;
  }
}

/* Default‑Instanz – kann im Test ersetzt werden */
module.exports = new RateLimiter(RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW);
module.exports.RateLimiter = RateLimiter;          // Export der Klasse selbst
