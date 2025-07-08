// lib/router.js
// -------------
// Mini‑Router: Pfad + Method -> Handler

const { normPath } = require("./httpUtils");

class Router {
  #routes = [];                       // [{method, path, handler}]

  add(method, path, handler) {
    this.#routes.push({ method, path, handler });
    return this;                      // Chainable
  }
  get(path, h)  { return this.add("GET",  path, h); }
  post(path, h) { return this.add("POST", path, h); }

  handle(req, res) {
    const p = normPath(req);
    for (const r of this.#routes) {
      if (r.method === req.method && r.path === p) {
        return r.handler(req, res);   // Handler entscheidet, was passiert
      }
    }
    return false;                     // nichts gepasst
  }
}

module.exports = Router;
