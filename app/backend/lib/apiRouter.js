// backend/lib/apiRouter.js
/**
 * Definiert alle Admin- und öffentlichen API-Endpunkte.
 * Routing-Grundgerüst kommt von lib/router.js.
 */
const Router      = require("./router");
const { sendJSON, collectJSON } = require("./httpUtils");
const { randHash }              = require("./utils");
const logger                   = require("./logger");
const { ADMIN_PASSWORD }        = require("./config");
const { requireAdmin }          = require("./admin");
const {
  roomsMeta,
  liveRooms,
  findRoom,
  ensureLiveRoom,
  banIp
} = require("./roomStore");

const router = new Router();

/**
 * POST /admin/login
 * Prüft Passwort und gibt bei Erfolg das Admin-Token zurück.
 */
router.post("/admin/login", (req, res) =>
  collectJSON(req, res, ({ password }) => {
    if (password !== ADMIN_PASSWORD) {
      return sendJSON(res, 403, {
        ok: false,
        error: "Falsches Passwort"
      });
    }
    const { ADMIN_TOKEN } = require("./config");
    sendJSON(res, 200, {
      ok: true,
      data: { token: ADMIN_TOKEN }
    });
  })
);

/**
 * GET /rooms.json
 * Liefert Liste aller Räume mit Hash und Name.
 */
router.get("/rooms.json", (_req, res) => {
  const list = Array.from(roomsMeta, ([hash, { name }]) => ({ hash, name }));
  sendJSON(res, 200, {
    ok: true,
    data: list
  });
});

/**
 * GET /blocklist.json
 * Gibt die Blockliste für einen Raum zurück (Parameter ?room=<hash>).
 */
router.get("/blocklist.json", (req, res) => {
  const roomHash = new URL(req.url, `http://${req.headers.host}`)
    .searchParams.get("room");
  const room = findRoom(roomHash);
  sendJSON(res, 200, {
    ok: true,
    data: room ? room.blocklist : []
  });
});

/**
 * POST /admin/add-room
 * Erlaubt Admins, einen neuen Raum anzulegen.
 */
router.post(
  "/admin/add-room",
  requireAdmin(({ name }, _req, res) => {
    if (!name) {
      return sendJSON(res, 400, {
        ok: false,
        error: "Name fehlt"
      });
    }
    const hash = randHash();
    roomsMeta.set(hash, {
      hash,
      name: name.trim(),
      blocklist: []
    });
    logger.info(`➕ Raum angelegt: ${name} (${hash})`);
    sendJSON(res, 200, {
      ok: true,
      data: { hash, name: name.trim() }
    });
  })
);

/**
 * POST /admin/remove-room
 * Erlaubt Admins, einen Raum zu löschen und alle Clients zu trennen.
 */
router.post(
  "/admin/remove-room",
  requireAdmin(({ hash }, _req, res) => {
    const room = liveRooms.get(hash);
    if (room) {
      room.activeClients.forEach((set) =>
        set.forEach((sock) =>
          sock.close(
            require("./config").CLOSE_CODES.ROOM_DELETED,
            "Room deleted"
          )
        )
      );
      liveRooms.delete(hash);
    }
    roomsMeta.delete(hash);
    logger.info(`🗑️  Raum entfernt: ${hash}`);
    sendJSON(res, 200, { ok: true });
  })
);

/**
 * POST /admin/update-blocklist
 * Erlaubt Admins, die Blockliste zu überschreiben und neue IPs zu bannen.
 */
router.post(
  "/admin/update-blocklist",
  requireAdmin(({ hash, list }, _req, res) => {
    const meta = findRoom(hash);
    if (!meta || !Array.isArray(list)) {
      return sendJSON(res, 400, {
        ok: false,
        error: "Ungültige Daten"
      });
    }

    // Nur neu hinzugefügte IPs werden gebannt
    const oldList = Array.isArray(meta.blocklist)
      ? [...meta.blocklist]
      : [];
    meta.blocklist = list;

    const room = ensureLiveRoom(hash);
    room.blocklist = list;

    list
      .filter((ip) => !oldList.includes(ip))
      .forEach((ip) => banIp(hash, ip));

    logger.info(`🚫 Blockliste aktualisiert für Raum ${hash}`);
    sendJSON(res, 200, { ok: true });
  })
);

module.exports = router.handle.bind(router);
