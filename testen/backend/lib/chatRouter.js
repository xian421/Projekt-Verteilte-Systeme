// backend/lib/chatRouter.js
// ------------------------------------------------------------
//  • "/" , "/chat" , "/chat.html"            → Landing-Seite
//  • "/chat/<64-hash>" (oder ...html/<hash>) → Chat-Shell
//  • alles Andere unter /chat…               → Landing (Fallback)
// ------------------------------------------------------------
const fs   = require("fs");
const path = require("path");
const { URL } = require("url");

const { PUBLIC_DIR }                 = require("./config");
const { serveLanding, setSec }       = require("./staticServer");
const { findRoom }                   = require("./roomStore");

// Pfad zur statischen Chat-HTML-Shell (ohne Platzhalter)
const CHAT_HTML = path.join(PUBLIC_DIR, "pages", "chat.html");

/**
 * chatRouter(req, res)
 *  ➜ true  → Anfrage komplett beantwortet
 *  ➜ false → Nächster Router / Static-Server soll übernehmen
 */
function chatRouter(req, res) {
  const url       = new URL(req.url, `http://${req.headers.host}`);
  const pathname  = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");

  /* ---------- 1 | Landing-Routen ------------------------- */
  if (pathname === "/" || pathname === "/chat" || pathname === "/chat.html") {
    serveLanding(res);
    return true;
  }

  /* ---------- 2 | Chat-Shell mit Hash -------------------- */
  // Akzeptiert  /chat/<hash>   sowie  /chat.html/<hash>
  const match = /^\/chat(?:\.html)?\/([a-f0-9]{64})$/i.exec(pathname);
  if (match) {
    const hash = match[1].toLowerCase();

    // Unbekannter Raum? ⇒ weiter zum nächsten Router (→ 404)
    if (!findRoom(hash)) return false;

    // Statische HTML-Shell ausliefern, keine Platzhalter mehr nötig
    fs.readFile(CHAT_HTML, (err, buf) => {
      if (err) {
        res.writeHead(500).end("Fehler");
        return;
      }
      setSec(res);
      res.writeHead(200, { "Content-Type": "text/html" }).end(buf);
    });
    return true;
  }

  /* ---------- 3 | Alles unter /chat… → Landing ---------- */
  if (pathname.startsWith("/chat/") || pathname.startsWith("/chat.html/")) {
    serveLanding(res);
    return true;
  }

  /* ---------- 4 | Kein Match → andere Router ------------ */
  return false;
}

module.exports = chatRouter;
