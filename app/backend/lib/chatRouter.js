// backend/lib/chatRouter.js
// ------------------------------------------------------------
//  • "/" , "/chat" , "/chat.html"            → Landing
//  • "/chat/<64‑hash>" (oder ...html/<hash>) → Chat‑Shell
//  • alles andere unter /chat…               → Landing‑Fallback
// ------------------------------------------------------------
const path = require("path");
const { URL } = require("url");

const { PUBLIC_DIR } = require("./config");
const { serveLanding } = require("./staticServer");
const { findRoom }     = require("./roomStore");
const { streamFile, normPath } = require("./httpUtils");

/* Statische Chat‑HTML‑Shell */
const CHAT_HTML = path.join(PUBLIC_DIR, "pages", "chat.html");

function chatRouter(req, res) {
  const url       = new URL(req.url, `http://${req.headers.host}`);
  const pathname  = normPath(req);

  /* ---------- 0 | ?room=<hash> → Redirect ---------------- */
  const qHash = url.searchParams.get("room");
  if (qHash && /^[a-f0-9]{64}$/i.test(qHash)) {
    if (!findRoom(qHash.toLowerCase())) return false;   // unbekannter Raum
    res.writeHead(302, { Location:`/chat/${qHash.toLowerCase()}` }).end();
    return true;
  }

  /* ---------- 1 | Landing‑Routen ------------------------- */
  if (pathname === "/" || pathname === "/chat" || pathname === "/chat.html") {
    serveLanding(res); return true;
  }

  /* ---------- 2 | Chat‑Shell mit Hash ------------------- */
  const match = /^\/chat(?:\.html)?\/([a-f0-9]{64})$/i.exec(pathname);
  if (match) {
    const hash = match[1].toLowerCase();
    if (!findRoom(hash)) return false;                  // 404 an nächsten Router
    streamFile(res, CHAT_HTML, 200, "text/html");
    return true;
  }

  /* ---------- 3 | Alles unter /chat… → Landing ---------- */
  if (pathname.startsWith("/chat/") || pathname.startsWith("/chat.html/")) {
    serveLanding(res); return true;
  }

  /* ---------- 4 | Kein Match → andere Router ------------ */
  return false;
}

module.exports = chatRouter;
