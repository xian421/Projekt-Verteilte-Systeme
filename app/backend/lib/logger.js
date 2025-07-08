// backend/lib/logger.js
/**
 * Einfache Logger-Klasse mit EventEmitter.
 * Protokolliert messages mit Zeitstempel und erlaubt, auf Events zu hören.
 */
const { EventEmitter } = require("events");

class Logger extends EventEmitter {
  /**
   * Erzeugt ein Zeitstempel-Prefix im Format [HH:MM:SS] LEVEL:
   * @param {string} level Großgeschriebene Log-Stufe (info, warn, err)
   * @returns {string}
   */
  #prefix(level) {
    const ts = new Date().toISOString().slice(11, 19);
    return `[${ts}] ${level.toUpperCase()}:`;
  }

  /**
   * Info-Log. Sendet an console.log und feuert „info“-Event.
   * @param  {...any} args 
   */
  info(...args) {
    console.log(this.#prefix("info"), ...args);
    this.emit("info", ...args);
  }

  /**
   * Warn-Log. Sendet an console.warn und feuert „warn“-Event.
   * @param  {...any} args 
   */
  warn(...args) {
    console.warn(this.#prefix("warn"), ...args);
    this.emit("warn", ...args);
  }

  /**
   * Error-Log. Sendet an console.error und feuert „error“-Event.
   * @param  {...any} args 
   */
  error(...args) {
    console.error(this.#prefix("err"), ...args);
    this.emit("error", ...args);
  }
}

module.exports = new Logger();
