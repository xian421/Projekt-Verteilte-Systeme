// backend/lib/chatRouter.js
/**
 * Router für Chat-Seiten und Redirects.
 * • „/“, „/chat“ und „/chat.html“ → Landing-Page  
 * • „/chat/<64-hex>“ → Chat-Shell  
 * • „/chat…“ (mit falschem Hash) → Landing-Page  
 * @param {import('http').IncomingMessage} req 
 * @param {import('http').ServerResponse} res 
 * @returns {boolean} true, wenn der Request verarbeitet wurde
 */
const path       = require("path");
const { URL }    = require("url");
const { PUBLIC_DIR }   = require("./config");
const { serveLanding } = require("./staticServer");
const { findRoom }     = require("./roomStore");
const { streamFile, normPath } = require("./httpUtils");

const CHAT_HTML = path.join(PUBLIC_DIR, "pages", "chat.html");

function chatRouter(req, res) {
  const url      = new URL(req.url, `http://${req.headers.host}`);
  const pathname = normPath(req);

  // Redirect bei ?room=<hash>
  const roomParam = url.searchParams.get("room");
  if (roomParam && /^[a-f0-9]{64}$/i.test(roomParam)) {
    const hash = roomParam.toLowerCase();
    if (!findRoom(hash)) return false;
    res.writeHead(302, { Location: `/chat/${hash}` }).end();
    return true;
  }

  // Landing-Routen
  if (pathname === "/" || pathname === "/chat" || pathname === "/chat.html") {
    serveLanding(res);
    return true;
  }

  // Chat-Shell mit gültigem Hash
  const shellMatch = /^\/chat(?:\.html)?\/([a-f0-9]{64})$/i.exec(pathname);
  if (shellMatch) {
    const hash = shellMatch[1].toLowerCase();
    if (!findRoom(hash)) return false;
    streamFile(res, CHAT_HTML, 200, "text/html");
    return true;
  }

  // Alle anderen /chat…-Routen → Landing
  if (pathname.startsWith("/chat/") || pathname.startsWith("/chat.html/")) {
    serveLanding(res);
    return true;
  }

  // Nicht abgefangen
  return false;
}

module.exports = chatRouter;
