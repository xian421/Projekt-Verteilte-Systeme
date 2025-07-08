// backend/lib/admin.js
// -----------------
// Middleware zur Prüfung des Admin-Tokens

const { collectJSON, sendJSON } = require("./httpUtils");
const { ADMIN_TOKEN } = require("./config");

/**
 * requireAdmin: Wrappt einen Handler und prüft vorab auf gültiges Admin-Token.
 * Handler erhält als erstes Argument den geparsten Body,
 * dann req und res.
 */
function requireAdmin(handler) {
  return (req, res) =>
    collectJSON(req, res, (body) => {
      if (body.token !== ADMIN_TOKEN) {
        return sendJSON(res, 403, { ok: false, error: "Forbidden: Admins only" });
      }
      return handler(body, req, res);
    });
}

module.exports = { requireAdmin };
