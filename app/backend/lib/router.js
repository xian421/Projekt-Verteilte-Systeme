// backend/lib/router.js
/**
 * Einfacher Router: Verknüpft HTTP-Methoden und Pfade mit Handler-Funktionen.
 */
const { normPath } = require("./httpUtils");

class Router {
  #routes = []; // Array von { method, path, handler }

  /**
   * Fügt eine Route hinzu.
   * @param {string} method HTTP-Methode (GET, POST, …)
   * @param {string} path   Exakter Pfad
   * @param {function(import('http').IncomingMessage, import('http').ServerResponse): any} handler
   * @returns {Router} this
   */
  add(method, path, handler) {
    this.#routes.push({ method, path, handler });
    return this;
  }

  /** Shortcut für GET-Routen */
  get(path, handler) {
    return this.add("GET", path, handler);
  }

  /** Shortcut für POST-Routen */
  post(path, handler) {
    return this.add("POST", path, handler);
  }

  /**
   * Behandelt einen eingehenden Request, indem es passende Route sucht.
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse}    res
   * @returns {any|boolean} Rückgabe des Handlers oder false, wenn kein Match
   */
  handle(req, res) {
    const currentPath = normPath(req);
    for (const { method, path, handler } of this.#routes) {
      if (req.method === method && currentPath === path) {
        return handler(req, res);
      }
    }
    return false;
  }
}

module.exports = Router;
