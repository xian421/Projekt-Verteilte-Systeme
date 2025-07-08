// backend/lib/respond.js
// ----------------------
// Hilfs‑Funktion, die **immer** JSON + CORS sendet
// und true zurückliefert, damit nachfolgende Router
// nicht mehr weiterarbeiten.

const { setSec } = require("./staticServer");

/**
 * json(res, status, obj) → true
 *  • Fügt Sicherheits‑ und CORS‑Header hinzu
 *  • Schickt JSON‑Payload
 *  • Gibt true zurück, sodass der aufrufende Router
 *    signalisieren kann: „Request erledigt“.
 */
function json(res, status = 200, obj = {}) {
  if (res.headersSent) return true;          // Doppel‑Sends abfangen
  setSec(res, true);                         // CORS + Security
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
  return true;
}

module.exports = { json };
