// backend/lib/apiRouter.js
// ------------------------------------------------------------
//  Admin-Routen + JSON-APIs   (Login, Räume, Blocklisten …)
// ------------------------------------------------------------
const { liveRooms }      = require("./roomStore");
const { CLOSE_CODES }    = require("./config");
const { URL }            = require("url");
const { ADMIN_PASSWORD, ADMIN_TOKEN } = require("./config");
const { randHash, log }  = require("./utils");
const {
  roomsMeta, findRoom, ensureLiveRoom, banIp
} = require("./roomStore");

const { setSec } = require("./staticServer");   //  ← CORS-Header-Helfer

/* ---------- Body einsammeln ------------------------------ */
function collectBody(req, res, cb) {
  let body = "";
  req.on("data", chunk => body += chunk);
  req.on("end", () => {
    try { cb(JSON.parse(body || "{}")); }
    catch { res.writeHead(400).end(); }
  });
  return true;
}

/* ---------- Router-Hauptfunktion ------------------------- */
function apiRouter(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p   = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "");

  /* --- /admin/login -------------------------------------- */
  if (p === "/admin/login") {
    if (req.method !== "POST") { res.writeHead(405).end(); return true; }
    return collectBody(req, res, ({ password }) => {
      if (password !== ADMIN_PASSWORD) return res.writeHead(403).end();
      setSec(res, true);   // CORS
      res.writeHead(200, { "Content-Type": "application/json" })
         .end(JSON.stringify({ token: ADMIN_TOKEN }));
    });
  }

  /* --- /rooms.json --------------------------------------- */
  if (p === "/rooms.json") {
    setSec(res, true);
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(
         Array.from(roomsMeta, ([hash, { name }]) => ({ hash, name }))
       ));
    return true;
  }

  /* --- /blocklist.json ----------------------------------- */
  if (p === "/blocklist.json") {
    const room = findRoom(url.searchParams.get("room"));
    setSec(res, true);
    res.writeHead(200, { "Content-Type": "application/json" })
       .end(JSON.stringify(room ? room.blocklist : []));
    return true;
  }

  /* --- /admin/add-room ----------------------------------- */
  if (p === "/admin/add-room" && req.method === "POST") {
    return collectBody(req, res, ({ name }) => {
      if (!name) return res.writeHead(400).end();
      const hash = randHash();
      roomsMeta.set(hash, { hash, name: name.trim(), blocklist: [] });
      log(`➕ Raum angelegt: ${name} (${hash})`);
      setSec(res, true);
      res.writeHead(200, { "Content-Type": "application/json" })
         .end(JSON.stringify({ hash, name }));
    });
  }

  /* --- /admin/remove-room -------------------------------- */
  if (p === "/admin/remove-room" && req.method === "POST") {
    return collectBody(req, res, ({ hash }) => {
      const room = liveRooms.get(hash);

      if (room) {
        const { ROOM_DELETED } = CLOSE_CODES;
        room.activeClients.forEach(set =>
          set.forEach(sock => sock.close(ROOM_DELETED, "Room deleted")));
        liveRooms.delete(hash);
      }

      roomsMeta.delete(hash);
      log(`🗑️  Raum entfernt: ${hash}`);

      setSec(res, true);
      res.writeHead(204).end();
    });
  }

  /* --- /admin/update-blocklist --------------------------- */
  if (p === "/admin/update-blocklist" && req.method === "POST") {
    return collectBody(req, res, ({ hash, list }) => {
      const meta = findRoom(hash);
      if (!meta || !Array.isArray(list)) return res.writeHead(400).end();

      meta.blocklist = list;
      const room = ensureLiveRoom(hash);
      room.blocklist = list;
      list.forEach(ip => banIp(hash, ip));   // sofort disconnect

      log(`🚫 Blockliste aktualisiert für Raum ${hash}`);
      setSec(res, true);
      res.writeHead(204).end();
    });
  }

  /* --- nichts gepasst → andere Router dürfen ran --------- */
  return false;
}

module.exports = apiRouter;
