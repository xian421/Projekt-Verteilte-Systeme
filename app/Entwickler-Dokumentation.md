**Entwicklerdokumentation: Realtime-Chat-System (Produktive Version)**

### 1. Architekturübersicht

* **Backend (Node.js)**: HTTP‑Server + WebSocket-Server, modulare Handler in `lib/`.

  * `index.js`: Einstiegspunkt, Einrichtung von HTTP, WS, Routing und Graceful Shutdown.
  * `apiRouter.js`: REST-Endpunkte (JSON-Proxies für Admin-/Public-API).
  * `wsHandler.js`: WS-Connection, Paket-Validation, Rate-Limit, Auto-Ban.
  * `roomStore.js`: In-Memory-Store für Räume, Nutzer und Blocklisten.
  * `heartbeat.js`: Ping-Interval für Alive-Checks.
  * `rateLimiter.js`: Sliding-Window-Limiter.
  * `config.js`: Umgebungsvariablen, Defaults, Validierung.
  * `httpUtils.js`, `respond.js`: Helpers für Header, JSON, Datei-Streaming.
  * `router.js`: Minimaler Pfad‑Router.
  * `logger.js`: EventEmitter-basierter Logger mit Zeitstempeln.
  * `utils.js`: Kleine Helfer (Hash-Generierung, HTML-Escape).

* **Frontend (Vanilla Web Components)**

  * Komponenten in `frontend/components/`:

    * `<chat-app>` & `<chat-admin>`: Haupt-View-Controller.
    * `ChatController.js`: Logik für WS-Kommunikation und DOM.
    * `AdminPanel.js`: CRUD für Räume & Blocklisten via Fetch.
  * Seiten in `frontend/pages/`: statische HTML-Einstiegspunkte.
  * Statisches CSS mit Container-Queries in `frontend/components/*.css`.
  * Utilities (`api.js`, `utils/`): Fetch-Abstraktion, Event-Bus, Sanitizer.

### 2. Entwicklungs-Setup

1. **Backend**

   ```bash
   cd backend
   npm install
   # Development
   npm start           # startet auf PORT aus .env (default 4441 / 8444)
   # Tests
   npm test            # Jest & Supertest
   ```
2. **Frontend**

   ```bash
   cd frontend
   npm install
   npm test            # Jest + Testing Library
   ```
3. **Umgebungsvariablen**: `.env` im Projektstamm

   ```ini
   PORT=8444
   ADMIN_PASSWORD=<PASS>
   NODE_ENV=production|development
   ```

### 3. Modul-API & Contracts

| Modul            | Exporte / Funktion                    | Beschreibung                                          |
| ---------------- | ------------------------------------- | ----------------------------------------------------- |
| `config.js`      | `{ PORT, ADMIN_PASSWORD, ... }`       | Zentrales Config-Objekt, `.validateConfig()` in prod. |
| `router.js`      | `Router`                              | Fügt Routen mit `get()`/`post()` hinzu.               |
| `apiRouter.js`   | `router.handle`                       | Handler für Admin-API und Public-API.                 |
| `wsHandler.js`   | `(wss) => void`                       | Attach-WS-Server: `connection`, `message`, `close`.   |
| `roomStore.js`   | `{ findRoom, ensureLiveRoom, ...}`    | Verwaltung aller Chat-Räume im Speicher.              |
| `heartbeat.js`   | `(wss, interval?) => Timer`           | Ping/Stale-Check.                                     |
| `rateLimiter.js` | `allowed(ip): boolean`                | Sliding-Window-Rate-Limiter.                          |
| `logger.js`      | `info()`, `warn()`, `error()`, events | Standard-Ausgabe + Emitter.                           |
| `httpUtils.js`   | `sendJSON()`, `collectJSON()`, ...    | HTTP-Helper für JSON, Streaming, NormPath.            |
| `respond.js`     | `json(res, status, obj)`              | Wrapper für JSON-Antworten.                           |
| `utils.js`       | `randHash()`, `escapeHTML()`          | Utility-Funktionen.                                   |

### 4. WebSocket-Paket-Definition

```ts
interface Packet {
  type: 'join' | 'changeName' | 'chat';
  name?: string;
  newName?: string;
  message?: string;
  token?: string;
}
```

* Validierung in `isValidPacket()` (Typen & non-empty).
* `join` liefert Historie aus `room.history`.

### 5. Testing & Qualitätssicherung

* **Backend**: Jest-Tests in `tests/`, Mocking von Konsolen-Outputs, Timer, FS, HTTP.
* **Frontend**: JSDOM-Umgebung, DOM-Queries über Testing Library.
* **Coverage**: Sicherstellen, dass alle Module >80% abgedeckt sind.
* **Linting**: ESLint + Prettier (optional hinzufügen).
* **CI/CD**: Im Docker-File wird Test-Stage ausgeführt automatisch.

### 6. Deployment & Docker

* **Dockerfile**: Multi-Stage mit `deps`, `test-runner`, `build-frontend`, `production`.
* **docker-compose.yml**: Service mit Healthcheck gegen `/`, Volumes für Logs.
* **Umgebung**: `.env` wird in Compose via `env_file` geladen.

### 7. Erweiterungsvorschläge

1. **Persistenz**: Swap In-Memory-Store gegen Redis oder DB.
2. **Authentifizierung**: JWT statt statischem ADMIN\_TOKEN.
3. **Skalierung**: Horizontal skalierbare WS-Cluster (z.B. Socket.IO + Pub/Sub).
4. **Monitoring**: Integriere Prometheus-Metriken (RPS, Latenz, WS-Connections).
5. **Feature-Flags**: Schalte neue Funktionen dynamisch mit LaunchDarkly.

---

*Dokumentation erzeugt am 09.07.2025*
