/* chat-app.js – Web-Component <chat-app>
   ------------------------------------------------------------
   • nutzt CHAT_TEMPLATE (kein HTTP-Fetch mehr)
   • Hash & Name aus Attributen, Fallback URL → /chat/<hash>
   • keinerlei window.ROOM_* Globals mehr
   • ChatController kapselt gesamte WS-/DOM-Logik
---------------------------------------------------------------- */

import { CHAT_TEMPLATE } from './chat-template.js';

/* Helper: 64-stelligen Raum-Hash aus Pfad ziehen */
const HASH_RE = /\/chat(?:\.html)?\/([a-f0-9]{64})$/i;
const hashFromPath = () =>
  HASH_RE.exec(location.pathname.replace(/\/{2,}/g, '/'))?.[1]?.toLowerCase() ||
  '';

/* ------------------------------------------------------------
   ChatController  (ehemals ChatApp aus chat.js)
------------------------------------------------------------ */
class ChatController {
  #ws;
  #userName = '';
  #joined = false;
  #wasBlocked = false;

  constructor(root, { roomHash, roomName }) {
    /* ---------- Grund-Config ----------------------------- */
    this.root = root;
    this.cfg = { roomHash, roomName };

    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    this.WS_URL = `${scheme}://${location.host}/${this.cfg.roomHash}`;

    /* ---------- DOM-Query einmalig ----------------------- */
    this.$roomNameDisplay = root.querySelector('#room-name-display');
    this.$nameInput = root.querySelector('#name-input');
    this.$startBtn = root.querySelector('#start-btn');
    this.$chatForm = root.querySelector('#chat-form');
    this.$chatInput = root.querySelector('#chat-input');
    this.$sendBtn = root.querySelector('#send-btn');
    this.$userDisplay = root.querySelector('#user-display');
    this.$chatBox = root.querySelector('#chat-box');
    this.$nameSec = root.querySelector('#name-form');
    this.$chatSec = root.querySelector('#chat-ui');
    this.$blockedSec = root.querySelector('#blocked-ui');
    this.$tooManyConnectionsSec = root.querySelector('#too-many-connections-ui');
    this.$editBtn = root.querySelector('#edit-name');

    /* ---------- Event-Binding & Init --------------------- */
    this.#bindDOM();
    this.#connect();
    this._loadRoomName();

    const saved = localStorage.getItem('chatName');
    if (saved) this.#autoJoin(saved);
  }

  /* ===== WebSocket Handling ============================== */
  #connect() {
    this.#ws = new WebSocket(this.WS_URL);

    this.#ws.addEventListener('message', (e) => this.#handleMessage(e.data));

    this.#ws.addEventListener('close', (e) => {
      if (e.code === 4000) return this.#handleBlocked();
      if (e.code === 4001) return this.#handleTooManyConnections();
      if (!this.#wasBlocked) {
        this.#appendSystem('⚠️ Verbindung getrennt – reconnect …');
        // Backend hält IP noch 3 s → 3,5 s warten
        setTimeout(() => !this.#wasBlocked && this.#connect(), 3500);
      }
    });
  }

  /* ===== DOM-Events ====================================== */
  #bindDOM() {
    this.$startBtn.addEventListener('click', () => this.#join());
    this.$nameInput.addEventListener('keypress', (e) =>
      e.key === 'Enter' && this.#join()
    );

    this.$chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!this.#userName) return this.#bounce(this.$nameInput);
      const msg = this.$chatInput.value.trim();
      if (!msg) return;
      this.#ws.send(JSON.stringify({ type: 'chat', message: msg }));
      this.$chatInput.value = '';
    });

    this.$editBtn.addEventListener('click', () => this.#changeName());
  }

  /* ===== Join / Nickname-Logik ============================ */
  #autoJoin(name) {
    this.#userName = name;
    this.$nameInput.value = name;
    this.$nameSec.hidden = true;
    this.$chatSec.hidden = false;
    this.$sendBtn.disabled = false;
    this.$userDisplay.textContent = `👤 ${name}`;
    this.$editBtn.hidden = false;

    const sendJoin = () => {
      this.#ws.send(JSON.stringify({ type: 'join', name }));
      this.#joined = true;
      localStorage.setItem('chatName', name);
    };

    if (this.#ws.readyState === WebSocket.OPEN) sendJoin();
    else this.#ws.addEventListener('open', sendJoin, { once: true });
  }

  #join() {
    const name = this.$nameInput.value.trim();
    if (!name) return this.#bounce(this.$nameInput);
    this.#autoJoin(name);
  }

  #changeName() {
    const newName = prompt('Neuer Name:', this.#userName)?.trim();
    if (!newName || newName === this.#userName) return;
    this.#ws.send(JSON.stringify({ type: 'changeName', newName }));
    this.$userDisplay.textContent = `👤 ${newName}`;
    this.#userName = newName;
    localStorage.setItem('chatName', newName);
  }

  /* ===== WS-Nachrichten-Handling ========================= */
  #handleMessage(raw) {
    try {
      const obj = JSON.parse(raw);
      if (obj?.type === 'system') return this.#appendSystem(obj.text);
    } catch {
      /* raw is plain HTML line */
    }
    this.#appendChat(raw);
  }

  #appendChat(text) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = text;
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

  /* ===== System-States =================================== */
  #handleBlocked() {
    this.#wasBlocked = true;
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$blockedSec.hidden = false;
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent = '';
  }

  #handleTooManyConnections() {
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$tooManyConnectionsSec.hidden = false;
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent =
      'Zu viele Verbindungen – bitte später erneut versuchen.';
  }

  /* ===== Hilfs-Funktionen ================================ */
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
      if (!res.ok) throw new Error();
      const list = await res.json();
      const room = list.find((r) => r.hash.toLowerCase() === this.cfg.roomHash);
      this.$roomNameDisplay.textContent = room
        ? `💬 ${room.name}`
        : `💬 ${this.cfg.roomHash}`;
    } catch {
      this.$roomNameDisplay.textContent = `💬 ${this.cfg.roomHash}`;
    }
  }

  /* ===== Cleanup ========================================= */
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
    let roomHash = this.getAttribute('room-hash')?.toLowerCase() || hashFromPath();
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
    if (!this._controller) return;
    if (name === 'room-hash') this._controller.updateConfig({ roomHash: value });
    if (name === 'room-name') this._controller.updateConfig({ roomName: value });
  }

  disconnectedCallback() {
    this._controller?.destroy();
  }
}

customElements.define('chat-app', ChatComponent);
