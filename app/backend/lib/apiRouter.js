// backend/lib/apiRouter.js
// ----------------
// Admin-APIs.  Nur noch Daten-/Logik-Code – Routing-Boilerplate übernimmt Router()

const Router = require("./router");
const { sendJSON, collectJSON } = require("./httpUtils");
const { randHash } = require("./utils");
const logger = require("./logger");
const { ADMIN_PASSWORD } = require("./config");
const { requireAdmin } = require("./admin");         // ← neu

const {
  roomsMeta,
  liveRooms,
  findRoom,
  ensureLiveRoom,
  banIp
} = require("./roomStore");

const router = new Router();

// ---------- POST /admin/login --------------------------
router.post("/admin/login", (req, res) =>
  collectJSON(req, res, ({ password }) => {
    if (password !== ADMIN_PASSWORD)
      return sendJSON(res, 403, { ok: false, error: "Falsches Passwort" });
    // Token wird aus der Config gelesen
    const { ADMIN_TOKEN } = require("./config");
    sendJSON(res, 200, { ok: true, data: { token: ADMIN_TOKEN } });
  })
);

// ---------- GET  /rooms.json ---------------------------
router.get("/rooms.json", (_req, res) => {
  const list = Array.from(roomsMeta, ([hash, { name }]) => ({ hash, name }));
  sendJSON(res, 200, { ok: true, data: list });
});

// ---------- GET  /blocklist.json -----------------------
router.get("/blocklist.json", (req, res) => {
  const roomHash = new URL(req.url, `http://${req.headers.host}`)
                     .searchParams.get("room");
  const room = findRoom(roomHash);
  sendJSON(res, 200, { ok: true, data: room ? room.blocklist : [] });
});

// ---------- POST /admin/add-room -----------------------
router.post(
  "/admin/add-room",
  requireAdmin(({ name }, _req, res) => {
    if (!name) return sendJSON(res, 400, { ok: false, error: "Name fehlt" });
    const hash = randHash();
    roomsMeta.set(hash, { hash, name: name.trim(), blocklist: [] });
    logger.info(`➕ Raum angelegt: ${name} (${hash})`);
    sendJSON(res, 200, { ok: true, data: { hash, name: name.trim() } });
  })
);

// ---------- POST /admin/remove-room --------------------
router.post(
  "/admin/remove-room",
  requireAdmin(({ hash }, _req, res) => {
    const room = liveRooms.get(hash);
    if (room) {
      room.activeClients.forEach(set =>
        set.forEach(sock =>
          sock.close(require("./config").CLOSE_CODES.ROOM_DELETED, "Room deleted")
        )
      );
      liveRooms.delete(hash);
    }
    roomsMeta.delete(hash);
    logger.info(`🗑️  Raum entfernt: ${hash}`);
    sendJSON(res, 200, { ok: true });
  })
);

// ---------- POST /admin/update-blocklist ---------------
router.post(
  "/admin/update-blocklist",
  requireAdmin(({ hash, list }, _req, res) => {
    const meta = findRoom(hash);
    if (!meta || !Array.isArray(list))
      return sendJSON(res, 400, { ok: false, error: "Ungültige Daten" });

    // Alte Blockliste merken
    const oldList = Array.isArray(meta.blocklist) ? [...meta.blocklist] : [];

    // Neue Blockliste übernehmen
    meta.blocklist = list;
    const room = ensureLiveRoom(hash);
    room.blocklist = list;

    // Nur wirklich neu hinzugefügte IPs bannen
    const toBan = list.filter(ip => !oldList.includes(ip));
    toBan.forEach(ip => banIp(hash, ip));

    logger.info(`🚫 Blockliste aktualisiert für Raum ${hash}`);
    sendJSON(res, 200, { ok: true });
  })
);

module.exports = router.handle.bind(router);
