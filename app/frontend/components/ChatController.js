/* ChatController – reine Business-Logik (ohne Shadow-DOM-Stuff) */
import { getBases } from "../utils/env.js";
import * as API from "../api.js";
import sanitize from "../utils/sanitize.js";

const adminToken = localStorage.getItem('adminToken') || null;

/**
 * Raum-Konfiguration, die ChatController erwartet.
 * @typedef {Object} RoomConfig
 * @property {string} roomHash
 * @property {string} [roomName]
 * @property {string} [httpBase]
 * @property {string} [wsBase]
 */
export default class ChatController {
  /** @type {WebSocket | null} */   #ws = null;
  /** @type {string} */             #userName = '';
  /** @type {boolean} */            #joined = false;
  /** @type {boolean} */            #wasBlocked = false;
  /** @type {number} */             #retryDelay = 3500; // ms

  /**
   * @param {ShadowRoot} root
   * @param {RoomConfig} cfg
   */
  constructor(root, cfg) {
    this.cfg  = { ...cfg };
    this.root = root;

    /* ---------- DOM-Cache ---------------------------- */
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
    this.$tokenForm             = root.querySelector('#token-form');
    this.$hashForm              = root.querySelector('#hash-form');
    this.$hashInput             = root.querySelector('#hash-input');

    /* ---------- Events & Init ------------------------ */
    this.#bindDOM();
    if (this.cfg.roomHash) {
      this.#connect();
      this._loadRoomName();
    } else {
      /** @type {HTMLElement} */ (this.$tokenForm).hidden = false;
      this.$hashForm?.addEventListener('submit', e => {
        e.preventDefault();
        const v = /** @type {HTMLInputElement} */ (this.$hashInput)?.value.trim().toLowerCase();
        if (v && /^[a-f0-9]{64}$/.test(v)) {
          this.updateConfig({ roomHash: v });
          /** @type {HTMLElement} */ (this.$tokenForm).hidden = true;
        }
      });
    }

    const saved = localStorage.getItem('chatName');
    if (saved) this.#autoJoin(saved);
  }

  /* ===== Öffentliche API ================================= */

  updateConfig(partial) {
    let needsReconnect = false;

    if (partial.roomHash && partial.roomHash !== this.cfg.roomHash) {
      this.cfg.roomHash = partial.roomHash.toLowerCase();
      needsReconnect = true;

      // ⇒ Namen nachladen, wenn wir noch keinen expliziten roomName haben
      if (!partial.roomName) this._loadRoomName();
    }
    if (typeof partial.roomName === 'string' && partial.roomName !== this.cfg.roomName) {
      this.cfg.roomName = partial.roomName;
      this._loadRoomName();
    }
    if (needsReconnect) {
      this.#ws?.close(1000, 'room change');
      this.#retryDelay = 3500;
      this.#connect();
    }
  }

  /* ===== WebSocket-Handling ============================== */

  /** @private */
  #buildWsUrl() {
    const wsBase = this.cfg.wsBase || getBases().ws;
    return `${wsBase}/${this.cfg.roomHash}`;
  }

  #connect() {
    this.#ws = new WebSocket(this.#buildWsUrl());

    this.#ws.addEventListener('open', () => (this.#retryDelay = 3500));

    this.#ws.addEventListener('message', e => this.#handleMessage(e.data));

    this.#ws.addEventListener('close', e => {
      if (e.code === 4002) return this.#handleUnknownRoom();
      if (e.code === 4006) return this.#handleRoomDeleted();
      if (e.code === 4000) return this.#handleBlocked();
      if (e.code === 4001) return this.#handleTooManyConnections();

      if (!this.#wasBlocked) {
        this.#appendSystem('⚠️ Verbindung getrennt – reconnect …');
        setTimeout(() => {
          if (!this.#wasBlocked) {
            this.#retryDelay = Math.min(this.#retryDelay * 2, 30000);
            this.#connect();
          }
        }, this.#retryDelay);
      }
    });

    this.#ws.addEventListener('open', () => {
      // Name schon bekannt, aber noch nicht angemeldet?
      if (this.#userName && !this.#joined) {
        this.#ws.send(JSON.stringify({
          type: 'join',
          name: this.#userName,
          token: adminToken
        }));
        this.#joined = true;
      }
    });

  }

  /* ===== DOM-Events ===================================== */

  #bindDOM() {
    this.$startBtn.addEventListener('click', () => this.#join());
    this.$nameInput.addEventListener('keypress', e => e.key === 'Enter' && this.#join());

    this.$chatForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!this.#userName) return this.#bounce(this.$nameInput);

      const msg = this.$chatInput.value.trim();
      if (!msg) return;

      this.#ws?.send(JSON.stringify({ type: 'chat', message: msg }));
      this.$chatInput.value = '';
    });

    this.$editBtn.addEventListener('click', () => this.#changeName());
  }

  /* ===== Join / Nickname-Logik =========================== */

  #autoJoin(name) {
    this.#userName = name;
    this.$nameInput.value          = name;
    this.$nameSec.hidden           = true;
    this.$chatSec.hidden           = false;
    this.$sendBtn.disabled         = false;
    this.$userDisplay.textContent  = `👤 ${name}`;
    this.$editBtn.hidden           = false;

    const sendJoin = () => {
      if (this.#joined) return;      // <── verhindert Doppel-Join
      this.#ws?.send(JSON.stringify({
        type : 'join',
        name,
        token: adminToken
      }));
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

  /* ===== WS-Nachrichten-Handling ======================== */

  #handleMessage(raw) {
    try {
      const obj = /** @type {{type:string,text:string}} */ (JSON.parse(raw));
      if (obj?.type === 'system') return this.#appendSystem(obj.text);
    } catch {/* raw war Plain-HTML */}
    this.#appendChat(raw);
  }

  #appendChat(text) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = sanitize(text);
    this.$chatBox.append(div);
    this.$chatBox.scrollTop = this.$chatBox.scrollHeight;
  }

  #appendSystem(text) {
    const div = document.createElement('div');
    div.className = 'system-message';
    div.innerHTML = sanitize(text);
    this.$chatBox.append(div);
    this.$chatBox.scrollTop = this.$chatBox.scrollHeight;
  }

  /* ===== System-States ================================== */

  #handleBlocked() {
    this.#wasBlocked        = true;
    this.$nameSec.hidden    = this.$chatSec.hidden = true;
    this.$blockedSec.hidden = false;
    this.$blockedSec.focus();
    this.$blockedSec.addEventListener("keydown", this.#trap, true);
    this.$editBtn.hidden    = true;
    this.$userDisplay.textContent = '';
  }

  #handleUnknownRoom() {
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$blockedSec.hidden = false;
    this.$blockedSec.querySelector('p').textContent =
      '❓ Unbekannter Raum-Token – bitte prüfen!';
    this.$blockedSec.focus();
    this.$blockedSec.addEventListener("keydown", this.#trap, true);
    this.$blockedSec.removeEventListener("keydown", this.#trap, true);
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent = '';
    this.#wasBlocked = true;          // verhindert Reconnect-Loop
  }

  #handleRoomDeleted() {
    this.$nameSec.hidden    = this.$chatSec.hidden = true;
    this.$blockedSec.hidden = false;
    this.$blockedSec.querySelector('p').textContent =
      '🗑️ Dieser Raum wurde vom Admin gelöscht.';
    this.$blockedSec.removeEventListener("keydown", this.#trap, true);
    this.$userDisplay.textContent = '';
    this.$editBtn.hidden = true;
  }

  #handleTooManyConnections() {
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$tooManyConnectionsSec.hidden = false;
    this.$tooManyConnectionsSec.focus();
    this.$tooManyConnectionsSec.addEventListener("keydown", this.#trap, true);
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent =
      'Zu viele Verbindungen – bitte später erneut versuchen.';
  }

  /* ===== Helpers ======================================== */

  #bounce(el) {
    el.focus();
    el.animate(
      { transform: ['translateX(0)', 'translateX(-4px)', 'translateX(4px)', 'translateX(0)'] },
      { duration: 300, easing: 'ease-in-out' }
    );
  }

  #trap = e => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const focusables = e.currentTarget.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey) {                    // ⇧‑TAB
      if (document.activeElement === first) last.focus();
    } else {                             // TAB vorwärts
      if (document.activeElement === last) first.focus();
    }
  };

  async _loadRoomName() {
    if (this.cfg.roomName) {
      this.$roomNameDisplay.textContent = `💬 ${this.cfg.roomName}`;
      return;
    }
    try {
      const list = await API.getRooms();
      const room = list.find(r =>
        r.hash.toLowerCase() === this.cfg.roomHash);
      this.$roomNameDisplay.textContent = room
        ? `💬 ${room.name}`
        : `💬 ${this.cfg.roomHash}`;
    } catch {
      this.$roomNameDisplay.textContent = `💬 ${this.cfg.roomHash}`;
    }
  }

  destroy() { this.#ws?.close(1000, 'component removed'); }
}
