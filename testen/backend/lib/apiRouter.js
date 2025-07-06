// lib/apiRouter.js
// ------------------------------------------------------------
//  Admin-Routen + JSON-APIs
//  * /admin/login
//  * /admin/add-room
//  * /admin/remove-room
//  * /admin/update-blocklist
//  * /rooms.json
//  * /blocklist.json?room=<hash>
// ------------------------------------------------------------
const { URL }       = require("url");
const { ADMIN_PASSWORD }   = require("./config");
const { randHash, log }    = require("./utils");
const {
  roomsMeta, findRoom, ensureLiveRoom, banIp
} = require("./roomStore");

/* -------- Helfer: Body einsammeln (JSON) ------------------- */
function collectBody(req, res, cb) {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    try { cb(JSON.parse(body || "{}")); }
    catch { res.writeHead(400).end(); }
  });
    return true; 
}

/* -------- Router-Hauptfunktion ----------------------------- */
function apiRouter(req, res) {
  const url  = new URL(req.url, `http://${req.headers.host}`);
  const p    = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");

  /* ---------- /admin/login --------------------------------- */
  if (p === "/admin/login") {
    if (req.method !== "POST") { res.writeHead(405).end(); return true; }
    return collectBody(req, res, ({ password }) => {
      if (password !== ADMIN_PASSWORD) return res.writeHead(403).end();
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
    });
  }

  /* ---------- /rooms.json ---------------------------------- */
  if (p === "/rooms.json") {
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(
         Array.from(roomsMeta, ([hash, { name }]) => ({ hash, name }))
       ));
    return true;
  }

  /* ---------- /blocklist.json ------------------------------ */
  if (p === "/blocklist.json") {
    const room = findRoom(url.searchParams.get("room"));
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(room ? room.blocklist : []));
    return true;
  }

  /* ---------- /admin/add-room ------------------------------ */
  if (p === "/admin/add-room" && req.method === "POST") {
    return collectBody(req, res, ({ name }) => {
      if (!name) return res.writeHead(400).end();
      const hash = randHash();
      roomsMeta.set(hash, { hash, name: name.trim(), blocklist: [] });
      log(`➕ Raum angelegt: ${name} (${hash})`);
      res.writeHead(200, { "Content-Type": "application/json" })
         .end(JSON.stringify({ hash, name }));
    });
  }

  /* ---------- /admin/remove-room --------------------------- */
  if (p === "/admin/remove-room" && req.method === "POST") {
    return collectBody(req, res, ({ hash }) => {
      roomsMeta.delete(hash);
      ensureLiveRoom(hash).activeClients?.forEach((_, ip) => banIp(hash, ip));
      log(`🗑️  Raum entfernt: ${hash}`);
      res.writeHead(204).end();
    });
  }

  /* ---------- /admin/update-blocklist ---------------------- */
  if (p === "/admin/update-blocklist" && req.method === "POST") {
    return collectBody(req, res, ({ hash, list }) => {
      const meta = findRoom(hash);
      if (!meta || !Array.isArray(list)) return res.writeHead(400).end();

      meta.blocklist = list;
      const room = ensureLiveRoom(hash);
      room.blocklist = list;
      list.forEach(ip => banIp(hash, ip));   // sofort disconnect
      log(`🚫 Blockliste aktualisiert für Raum ${hash}`);
      res.writeHead(204).end();
    });
  }

  /* ---------- Keine passende Admin/JSON-Route -------------- */
  return false;   // damit nachfolgende Router übernehmen können
}

module.exports = apiRouter;
