/* chat-app.js – Web-Component <chat-app>
   ------------------------------------------------------------
   • JSDoc-Typen + ESLint-freundlich
   • updateConfig + Exponential Back-off (Schritt 1)
   • Focus-Fix (Schritt 2)
   ------------------------------------------------------------ */

import { CHAT_TEMPLATE } from './chat-template.js';
const adminToken = localStorage.getItem('adminToken') || null;


/**
 * 64-stelligen Raum-Hash aus der URL ziehen.
 * @returns {string} Lower-case 64 hex chars or empty string
 */
const hashFromPath = () => {
  const HASH_RE = /\/chat(?:\.html)?\/([a-f0-9]{64})$/i;
  return HASH_RE.exec(location.pathname.replace(/\/{2,}/g, '/'))?.[1]?.toLowerCase() || '';
};

/**
 * Raum-Konfiguration, die <chat-app> als Attribute bekommen kann.
 * @typedef {Object} RoomConfig
 * @property {string} roomHash            64-char Hex-Hash
 * @property {string} [roomName]          Anzeigename (optional)
 */

/* ------------------------------------------------------------
   ChatController
------------------------------------------------------------ */
class ChatController {
  /** @type {WebSocket | null}    */ #ws = null;
  /** @type {string}              */ #userName = '';
  /** @type {boolean}             */ #joined = false;
  /** @type {boolean}             */ #wasBlocked = false;
  /** @type {number}              */ #retryDelay = 3500; // ms

  /**
   * @param {ShadowRoot} root
   * @param {RoomConfig} cfg
   */
  constructor(root, cfg) {
    /* ---------- Grund-Config --------------------------- */
    /** @type {RoomConfig} */
    this.cfg = { ...cfg };
    this.root = root;

    /* ---------- DOM-Cache ------------------------------ */
    this.$roomNameDisplay       = root.querySelector('#room-name-display');
    this.$nameInput             = root.querySelector('#name-input');
    this.$startBtn              = root.querySelector('#start-btn');
    this.$chatForm              = root.querySelector('#chat-form');
    this.$chatInput             = root.querySelector('#chat-input');
    this.$sendBtn               = root.querySelector('#send-btn');
    this.$userDisplay           = root.querySelector('#user-display');
    this.$chatBox               = root.querySelector('#chat-box');
    this.$nameSec               = root.querySelector('#name-form');
    this.$chatSec               = root.querySelector('#chat-ui');
    this.$blockedSec            = root.querySelector('#blocked-ui');
    this.$tooManyConnectionsSec = root.querySelector('#too-many-connections-ui');
    this.$editBtn               = root.querySelector('#edit-name');

    /* ---------- Events & Init -------------------------- */
    this.#bindDOM();
    this.#connect();
    this._loadRoomName();

    const saved = localStorage.getItem('chatName');
    if (saved) this.#autoJoin(saved);
  }

  /* ===== Öffentliche API =============================== */

  /**
   * Merge neue Config; reconnect falls Hash wechselt.
   * @param {Partial<RoomConfig>} partial
   */
  updateConfig(partial) {
    let needsReconnect = false;

    if (partial.roomHash && partial.roomHash !== this.cfg.roomHash) {
      this.cfg.roomHash = partial.roomHash.toLowerCase();
      needsReconnect = true;
    }
    if (typeof partial.roomName === 'string' && partial.roomName !== this.cfg.roomName) {
      this.cfg.roomName = partial.roomName;
      this._loadRoomName();
    }
    if (needsReconnect) {
      this.#ws?.close(1000, 'room change');
      this.#retryDelay = 3500;      // Delay zurücksetzen
      this.#connect();
    }
  }

  /* ===== WebSocket Handling ============================ */

  /** @returns {string} ws://…/hash oder wss://… */
  #buildWsUrl() {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${scheme}://${location.host}/${this.cfg.roomHash}`;
  }

  #connect() {
    this.#ws = new WebSocket(this.#buildWsUrl());

    this.#ws.addEventListener('open', () => {
      this.#retryDelay = 3500;                 // Erfolg → Delay reset
    });

    this.#ws.addEventListener('message', (e) => this.#handleMessage(e.data));

    this.#ws.addEventListener('close', (e) => {
      if (e.code === 4006) return this.#handleRoomDeleted();
      if (e.code === 4000) return this.#handleBlocked();
      if (e.code === 4001) return this.#handleTooManyConnections();

      if (!this.#wasBlocked) {
        this.#appendSystem('⚠️ Verbindung getrennt – reconnect …');
        setTimeout(() => {
          if (!this.#wasBlocked) {
            this.#retryDelay = Math.min(this.#retryDelay * 2, 30000); // bis 30 s
            this.#connect();
          }
        }, this.#retryDelay);
      }
    });
  }

  /* ===== DOM-Events =================================== */
  #bindDOM() {
    this.$startBtn.addEventListener('click', () => this.#join());
    this.$nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.#join();
    });

    this.$chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.#userName) return this.#bounce(this.$nameInput);

      const msg = this.$chatInput.value.trim();
      if (!msg) return;

      this.#ws?.send(JSON.stringify({ type: 'chat', message: msg }));
      this.$chatInput.value = '';
    });

    this.$editBtn.addEventListener('click', () => this.#changeName());
  }

  /* ===== Join / Nickname-Logik ========================= */
  #autoJoin(name) {
    this.#userName = name;
    this.$nameInput.value   = name;
    this.$nameSec.hidden    = true;
    this.$chatSec.hidden    = false;
    this.$sendBtn.disabled  = false;
    this.$userDisplay.textContent = `👤 ${name}`;
    this.$editBtn.hidden    = false;

    const sendJoin = () => {
      this.#ws?.send(JSON.stringify({ type: 'join', name, token: adminToken }));
      this.#joined = true;
      localStorage.setItem('chatName', name);
    };
    (this.#ws?.readyState === WebSocket.OPEN)
      ? sendJoin()
      : this.#ws?.addEventListener('open', sendJoin, { once: true });
  }

  #join() {
    const name = this.$nameInput.value.trim();
    if (!name) return this.#bounce(this.$nameInput);
    this.#autoJoin(name);
  }

  #changeName() {
    const newName = prompt('Neuer Name:', this.#userName)?.trim();
    if (!newName || newName === this.#userName) return;
    this.#ws?.send(JSON.stringify({ type: 'changeName', newName }));
    this.$userDisplay.textContent = `👤 ${newName}`;
    this.#userName = newName;
    localStorage.setItem('chatName', newName);
  }

  /* ===== WS-Nachrichten-Handling ====================== */

  /**
   * @param {string} raw JSON-String oder bereits HTML‐Snippet
   */
  #handleMessage(raw) {
    try {
      const obj = /** @type {{type:string,text:string}} */ (JSON.parse(raw));
      if (obj?.type === 'system') return this.#appendSystem(obj.text);
    } catch {
      /* raw ist plain HTML */
    }
    this.#appendChat(raw);
  }

  #appendChat(text) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = text;            // ⚠️ Backend muss XSS filtern
    this.$chatBox.append(div);
    this.$chatBox.scrollTop = this.$chatBox.scrollHeight;
  }

  #appendSystem(text) {
    const div = document.createElement('div');
    div.className = 'system-message';
    div.innerHTML = text;
    this.$chatBox.append(div);
    this.$chatBox.scrollTop = this.$chatBox.scrollHeight;
  }

  /* ===== System-States ================================ */
  #handleBlocked() {
    this.#wasBlocked = true;
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$blockedSec.hidden = false;
    this.$blockedSec.focus();                 // SR-Focus
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent = '';
  }

    #handleRoomDeleted() {
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$blockedSec.hidden = false;
    this.$blockedSec.querySelector('p').textContent =
      '🗑️ Dieser Raum wurde vom Admin gelöscht.';
    this.$userDisplay.textContent = '';
    this.$editBtn.hidden = true;
  }


  #handleTooManyConnections() {
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$tooManyConnectionsSec.hidden = false;
    this.$tooManyConnectionsSec.focus();
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent =
      'Zu viele Verbindungen – bitte später erneut versuchen.';
  }

  /* ===== Helpers ====================================== */
  #bounce(el) {
    el.focus();
    el.animate(
      { transform: ['translateX(0)', 'translateX(-4px)', 'translateX(4px)', 'translateX(0)'] },
      { duration: 300, easing: 'ease-in-out' }
    );
  }

  async _loadRoomName() {
    if (this.cfg.roomName) {
      this.$roomNameDisplay.textContent = `💬 ${this.cfg.roomName}`;
      return;
    }
    try {
      const res = await fetch('/rooms.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const list = /** @type {{hash:string,name:string}[]} */ (await res.json());
      const room = list.find((r) => r.hash.toLowerCase() === this.cfg.roomHash);
      this.$roomNameDisplay.textContent = room
        ? `💬 ${room.name}`
        : `💬 ${this.cfg.roomHash}`;
    } catch {
      this.$roomNameDisplay.textContent = `💬 ${this.cfg.roomHash}`;
    }
  }

  destroy() {
    this.#ws?.close(1000, 'component removed');
  }
}

/* ------------------------------------------------------------
   Custom-Element <chat-app>
------------------------------------------------------------ */
class ChatComponent extends HTMLElement {
  static observedAttributes = ['room-hash', 'room-name'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    /* 1) Hash / Name bestimmen */
    const roomHash = this.getAttribute('room-hash')?.toLowerCase() || hashFromPath();
    if (!roomHash) return location.assign('/chat.html');
    const roomName = this.getAttribute('room-name') || '';

    /* 2) Template injizieren */
    const tpl = document.createElement('template');
    tpl.innerHTML = CHAT_TEMPLATE;
    this.shadowRoot.append(tpl.content.cloneNode(true));

    /* 3) Controller starten */
    this._controller = new ChatController(this.shadowRoot, { roomHash, roomName });
  }

  attributeChangedCallback(name, _, value) {
    this._controller?.updateConfig(
      name === 'room-hash' ? { roomHash: value } : { roomName: value }
    );
  }

  disconnectedCallback() {
    this._controller?.destroy();
  }
}

customElements.define('chat-app', ChatComponent);
