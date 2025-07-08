// backend/lib/respond.js
/**
 * Helfer für einheitliche JSON-Antworten.
 * Sendet immer CORS-/Security-Header und Payload als JSON.
 */
const { setSec } = require("./staticServer");

/**
 * Sendet JSON-Antwort und gibt true zurück, damit Router wissen,
 * dass die Anfrage abgeschlossen ist.
 *
 * @param {import('http').ServerResponse} res
 * @param {number} [status=200] HTTP-Statuscode
 * @param {Object} [obj={}] Antwortobjekt
 * @returns {boolean}
 */
function json(res, status = 200, obj = {}) {
  if (res.headersSent) return true;
  setSec(res, true);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
  return true;
}

module.exports = { json };
