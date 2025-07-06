// lib/chatRouter.js
// ------------------------------------------------------------
//  * "/" , "/chat" , "/chat.html"            → Landing
//  * "/chat/<64-hash>" (oder ...html/<hash>) → Chat-Seite
//  * alles Andere unter /chat…               → Landing (Fallback)
// ------------------------------------------------------------
const fs   = require("fs");
const path = require("path");
const { URL } = require("url");

const { PUBLIC_DIR, HASH_RE } = require("./config");
const { serveLanding, serve404, streamFile, setSec } = require("./staticServer");
const { findRoom } = require("./roomStore");

// Vorab den Chat-HTML-Template-Pfad bestimmen
const CHAT_HTML = path.join(PUBLIC_DIR, "chat.html");

/**
 * chatRouter(req, res)
 * Liefert true ⇢ Anfrage komplett erledigt
 * Liefert false ⇢ Nächster Router / Static-Server soll übernehmen
 */
function chatRouter(req, res) {
  const { host } = req.headers;
  const url = new URL(req.url, `http://${host}`);
  const pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");

  /* --- Landing Routen ------------------------------------- */
  if (pathname === "/" || pathname === "/chat" || pathname === "/chat.html") {
    serveLanding(res);
    return true;
  }

  /* --- Chat-HTML mit Hash --------------------------------- */
  // Akzeptiert /chat/<hash>  sowie  /chat.html/<hash>
  const match = /^\/chat(?:\.html)?\/([a-f0-9]{64})$/i.exec(pathname);
  if (match) {
    const hash = match[1].toLowerCase();
    const room = findRoom(hash);
    if (!room) {                      // Unbekannter Raum? -> 404
      serve404(res);
      return true;
    }

    // Vorlage lesen & Platzhalter ersetzen
    fs.readFile(CHAT_HTML, "utf8", (err, html) => {
      if (err) {
        res.writeHead(500).end("Fehler");
        return;
      }
      setSec(res);
      res.writeHead(200, { "Content-Type": "text/html" })
         .end(html.replace(/__ROOM_NAME__/g, room.name)
                  .replace(/__ROOM_HASH__/g, hash));
    });
    return true;
  }

  /* --- Fallback für alles, das unter /chat… beginnt ----- */
  if (pathname.startsWith("/chat/") || pathname.startsWith("/chat.html/")) {
    serveLanding(res);
    return true;
  }

  /* Kein Match – andere Router dranlassen */
  return false;
}

module.exports = chatRouter;
