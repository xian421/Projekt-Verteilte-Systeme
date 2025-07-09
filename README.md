# Entwickler-Dokumentation: Chat-Server

## Inhaltsverzeichnis

1. [Einführung](#einführung)
2. [Architekturübersicht](#architekturübersicht)
3. [Installation & Setup](#installation--setup)

   * [Voraussetzungen](#voraussetzungen)
   * [Lokale Entwicklung](#lokale-entwicklung)
4. [Konfiguration](#konfiguration)
5. [Projektstruktur](#projektstruktur)
6. [Backend-Module](#backend-module)

   * [index.js (Server Start)](#indexjs-server-start)
   * [API-Router](#api-router)
   * [WebSocket-Handler](#websocket-handler)
   * [Room Store](#room-store)
   * [Rate Limiter](#rate-limiter)
   * [Logger & Utilities](#logger--utilities)
7. [Frontend-Komponenten](#frontend-komponenten)

   * [Web-Components](#web-components)
   * [ChatController](#chatcontroller)
   * [AdminPanel](#adminpanel)
   * [Routing & Landing](#routing--landing)
8. [Authentifizierung & Berechtigungen](#authentifizierung--berechtigungen)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Entwicklungsworkflow](#entwicklungsworkflow)
12. [Contributing](#contributing)

---

## Einführung

Diese Dokumentation richtet sich an Entwickler\:innen, die am Chat-Projekt mitarbeiten möchten. Sie beschreibt die Architektur, die wichtigsten Module, Konfigurationsmöglichkeiten sowie den Workflow für Entwicklung, Test und Deployment.

---

## Architekturübersicht

Der Chat-Server besteht aus:

* **Backend** (Node.js)

  * HTTP-API (REST-Endpunkte für Admin und Public)
  * WebSocket-Server für Realtime-Chat
  * In-Memory Store für Räume, Clients, Historie
  * Authentifizierungs- und Rate-Limiter-Mechanismen
* **Frontend** (Vanilla Web-Components)

  * Chat UI und Admin Panel als Custom Elements
  * Sanitizer zur sicheren Anzeige von HTML-Inhalten
  * Utils für HTTP-/WS-Basics und Event-Bus
* **Tests**

  * Backend: Jest + Supertest
  * Frontend: Jest + jsdom
* **Deployment**

  * Dockerfile (Multi-Stage mit Test-Runner und Prod-Build)
  * docker-compose für lokale/CI-Umgebung

---

## Installation & Setup

### Voraussetzungen

* Node.js ≥18
* npm oder yarn
* Docker & Docker Compose (optional)
* Git

### Lokale Entwicklung

1. Repository klonen:

   ```bash
   git clone <repo-url>
   cd <projekt-verzeichnis>
   ```
2. Backend dependencies installieren:

   ```bash
   cd backend
   npm install
   ```
3. Frontend dependencies installieren:

   ```bash
   cd ../frontend
   npm install
   ```
4. Backend starten:

   ```bash
   cd ../backend
   npm start
   ```
5. Im Browser öffnen: `http://localhost:4441`

---

## Konfiguration

Alle Einstellungen im `backend/lib/config.js`:

| Variable            | Zweck                                  | Default                          |
| ------------------- | -------------------------------------- | -------------------------------- |
| `ADMIN_PASSWORD`    | Passwort für Admin-Login               | `keule`                          |
| `ADMIN_TOKEN`       | SHA256 von `ADMIN_PASSWORD`            | erzeugt                          |
| `PORT`              | HTTP-Server-Port                       | `4441`                           |
| `PUBLIC_DIR`        | Pfad zu Frontend-Assets (Dev vs. Prod) | `frontend/` oder `frontend/dist` |
| `MAX_HISTORY`       | Maximale Chat-Historie                 | `100`                            |
| `RATE_LIMIT_COUNT`  | Anfragen/Sekunde pro IP                | `5`                              |
| `RATE_LIMIT_WINDOW` | Fenster in ms für Rate-Limiter         | `10000`                          |

* Production-Modus erfordert `.env` mit `ADMIN_PASSWORD` und `PORT`.
* `validateConfig()` wirft Fehler in Production, falls Variablen fehlen.

---

## Projektstruktur

```
/backend
  index.js
  lib/
    apiRouter.js
    wsHandler.js
    roomStore.js
    rateLimiter.js
    logger.js
    utils.js, httpUtils.js, staticServer.js, config.js
  tests/
    *.test.js
/frontend
  components/
    AdminPanel.js, ChatApp.js, ChatController.js
    Templates: admin-template.html, chat-template.html
    Styles: admin.css, chat.css
  pages/
    admin.html, chat.html, landing.html, 404.html
  src/
    landing.js, chat-router.js
  utils/
    env.js, sanitize.js, bus.js
  styles/, img/
  tests/sanitize.test.js
Dockerfile
docker-compose.yml
```

---

## Backend-Module

### index.js (Server Start)

* Erstellt HTTP-Server mit CORS-Support und Routing:

  * `apiRouter` für REST-APIs
  * `chatRouter` für statische Chat/HTML
  * `serveStatic` für Assets
* WebSocket-Server (`ws`) mit `attachWs`
* Heartbeat-Intervall zum Ping/Pong (in `lib/heartbeat.js`)
* Graceful Shutdown bei `SIGINT`

### API-Router (`lib/apiRouter.js`)

* Basierend auf `Router`-Klasse
* Endpunkte:

  * `POST /admin/login`
  * `GET /rooms.json`, `GET /blocklist.json?room=`
  * `POST /admin/add-room`, `/remove-room`, `/update-blocklist`
* Admin-Routen schützen mit Middleware `requireAdmin`

### WebSocket-Handler (`lib/wsHandler.js`)

* `attachWss(wss)` registriert `connection`, `message`, `close`
* Prüft gültigen Room-Hash und IP-Blocklist
* Verhindert Duplicate-Connections
* Admin-Token aus Login-Paket in `socket.isAdmin`
* Paket-Handling:

  * `join`: History-Replay, Broadcast Join-System-Message
  * `chat`: Zeitstempel, Escape, History-Push, `sendToAll`
  * `changeName`: Name-Update + System-Message
* Bei Rate-Limit: `banIp(hash, ip, {auto:true})`

### Room Store (`lib/roomStore.js`)

* `roomsMeta`: Map von Hash → `{name,blocklist}`
* `liveRooms`: Map von Hash → Laufzeit-Daten `{activeClients,history,...}`
* Funktionen:

  * `findRoom`, `ensureLiveRoom`
  * `sendToAdmins`: Nur Admin-Sockets, backpressure-check
  * `sendToAll`: Strip IP-Spans für Nicht-Admins
  * `broadcastSystem` (System-Nachrichten)
  * `banIp`: Blocklist-Update, Socket-Terminate, System-Message adminOnly

### Rate Limiter (`lib/rateLimiter.js`)

* Sliding-Window-Algorithmus
* `allowed(ip)` erhöht Zähler und gibt Boolean zurück
* Loggt Warnung bei Überschreitung

### Logger & Utilities

* `lib/logger.js`: EventEmitter mit `info`, `warn`, `error`, Timestamp
* `lib/utils.js`: `randHash()`, `escapeHTML()`
* `lib/httpUtils.js`: `setSec`, `sendJSON`, `collectJSON`, `normPath`, `streamFile`
* `lib/staticServer.js`: Landing, 404, Assets-Serving

---

## Frontend-Komponenten

### Web-Components

* `<chat-admin>`: Admin-Panel mit Login, Raum-/Blocklist-Management
* `<chat-app>`: Haupt-Chat UI; rendert via Template, initialisiert `ChatController`
* `<chat-dashboard>`: Kombiniert Admin- und Chat-UI

### ChatController

* Kapselt WS-Logik & DOM-Manipulation (im Shadow Root)
* Handles:

  * WebSocket-Verbindung, Reconnect-Logik
  * Join-Flow (Name, Admin-Token)
  * Chat-Nachrichten senden & empfangen
  * System-States (Blocked, Unknown Room, Too Many Connections)
  * Sanitization via `sanitize.js`

### AdminPanel

* Proxy-basiertes State-Management
* Login-Flow: `POST /admin/login` → Token in `localStorage`
* CRUD für Räume und Blocklist via API-Calls
* Event-Bus (`bus.js`) koordiniert zwischen Admin und Chat-App

### Routing & Landing

* `landing.js`: Redirect vom Token-Form zur `/chat/<hash>` URL
* `chat-router.js`: Extrahiert Hash aus Pfad, injiziert in `<chat-app>`

---

## Authentifizierung & Berechtigungen

* Admin-Password→ `ADMIN_TOKEN` (SHA256)
* REST: JWT-ähnlich: `token` im JSON-Body (Admin-API)
* WS: `token` im `join`-Paket → `socket.isAdmin`
* `sendToAll` und `sendToAdmins` unterscheiden Inhalte für Admin/Non-Admin

---

## Testing

* **Backend**: `backend/tests/*.test.js`

  * Module- und Integrationstests mit Jest & Supertest
* **Frontend**: `frontend/tests/sanitize.test.js` mit jsdom
* CI: Docker-Build-Stage `test-runner` führt beide Test-Suites aus

---

## Deployment

* **Dockerfile** Multi-Stage:

  1. `deps`: `npm install`
  2. `test-runner`: Tests
  3. `build-frontend`: Kopie statischer Dateien nach `dist`
  4. `production`: Prod-Deps + Assets
* **docker-compose.yml**:

  * Service `chat-app` auf Port 4441
  * Healthcheck via `curl`
  * Volumen für Logs
  * Env-File `.env`, `NODE_ENV=production`

---

## Entwicklungsworkflow

1. Feature-Branch erstellen
2. Tests lokal ausführen:

   ```bash
   cd backend && npm test
   cd ../frontend && npm test
   ```
3. Code-Review & Merge
4. CI/CD baut Docker-Image und deployed

---

## Contributing

* Fork & PR-Flow
* Einheitliches Styling: Prettier, ESLint (falls konfiguriert)
* Commits in Englisch, klare Messages
* Tests für neue Features / Bugfixes

---

