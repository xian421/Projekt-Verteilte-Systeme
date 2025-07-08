// backend/lib/rateLimiter.js
/**
 * Sliding-Window Rate Limiter.
 * Erlaubt maximal MAX Anfragen pro WINDOW Millisekunden pro IP.
 */
const { RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW } = require("./config");
const logger = require("./logger");

/**
 * RateLimiter-Klasse.
 */
class RateLimiter {
  /**
   * @param {number} maxCount Maximale Anzahl Events in Window
   * @param {number} windowMs Zeitfenster in Millisekunden
   */
  constructor(maxCount, windowMs) {
    this.MAX = maxCount;
    this.WIN = windowMs;
    // Map von ip → { count: number, start: timestamp }
    this.state = new Map();
  }

  /**
   * Prüft, ob eine neue Anfrage von dieser IP erlaubt ist.
   * @param {string} ip 
   * @returns {boolean} true, wenn unter dem Limit
   */
  allowed(ip) {
    const now = Date.now();
    const rec = this.state.get(ip) || { count: 0, start: now };

    // Window abgelaufen?
    if (now - rec.start > this.WIN) {
      rec.count = 0;
      rec.start = now;
    }

    rec.count += 1;
    this.state.set(ip, rec);

    const ok = rec.count <= this.MAX;
    if (!ok) {
      logger.warn(`Rate\u2011Limit: ${ip} blocked (${rec.count}/${this.MAX})`);
    }
    return ok;
  }
}

// Default-Instanz mit Konfigurationswerten
const defaultLimiter = new RateLimiter(RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW);
defaultLimiter.RateLimiter = RateLimiter;
module.exports = defaultLimiter;
