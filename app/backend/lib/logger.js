// lib/logger.js
// -------------
// Mini‑Logger mit EventEmitter.  Zentralisiert Konsolen­ausgaben.

const { EventEmitter } = require("events");

class Logger extends EventEmitter {
  #prefix(level) {
    const ts = new Date().toISOString().slice(11, 19);
    return `[${ts}] ${level.toUpperCase()}:`;
  }

  info (...args) { console.log (this.#prefix("info"), ...args);  this.emit("info",  ...args); }
  warn (...args) { console.warn(this.#prefix("warn"), ...args);  this.emit("warn",  ...args); }
  error(...args) { console.error(this.#prefix("err"), ...args);  this.emit("error", ...args); }
}

module.exports = new Logger();
