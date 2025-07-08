// backend/lib/admin.js
/**
 * Middleware, die einen Handler nur bei gültigem Admin-Token ausführt.
 * @param {function(Object, import('http').IncomingMessage, import('http').ServerResponse): any} handler 
 *   Handler, der den geparsten Body, Request und Response erhält.
 * @returns {import('http').RequestListener}
 */
const { collectJSON, sendJSON } = require("./httpUtils");
const { ADMIN_TOKEN } = require("./config");

function requireAdmin(handler) {
  return (req, res) =>
    collectJSON(req, res, (body) => {
      if (body.token !== ADMIN_TOKEN) {
        return sendJSON(res, 403, {
          ok: false,
          error: "Forbidden: Admins only"
        });
      }
      return handler(body, req, res);
    });
}

module.exports = { requireAdmin };
