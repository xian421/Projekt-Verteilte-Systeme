import { el, span, btn, copyBtn } from '/src/lib/dom.js';

/* ---------- 0 | zentrale Basis-URLs -------------------- */
const CFG       = window.ChatConfig || {};
const HTTP_BASE = CFG.httpBase
               || `${location.protocol}//${location.host}`;

/* ---------- Template laden ----------------------------- */
async function loadTemplate() {
  const res = await fetch(`${HTTP_BASE}/components/admin-template.html`);
  if (!res.ok) throw new Error('template not found');
  return res.text();
}

export default class ChatAdmin extends HTMLElement {
  state = new Proxy({ rooms: [], blocklist: [] },
    { set: (o, p, v) => (o[p] = v, this.#render(p), true) });

  #currentHash = '';

  constructor() { super(); this.attachShadow({ mode: 'open' }); }

  async connectedCallback() {
    const html = await loadTemplate();
    const tpl  = document.createElement('template');
    tpl.innerHTML = html;
    tpl.content.querySelector('link[rel="stylesheet"]')
               .href = `${HTTP_BASE}/components/admin.css`;
    this.shadowRoot.append(tpl.content.cloneNode(true));

    /* DOM-Cache … (unverändert) */
    this.$rooms  = this.shadowRoot.getElementById('rooms-list');
    this.$blocks = this.shadowRoot.getElementById('blocklist');
    this.$roomInp= this.shadowRoot.getElementById('room-name');
    this.$addRoom= this.shadowRoot.getElementById('add-room');
    this.$ipInp  = this.shadowRoot.getElementById('block-ip');
    this.$addIp  = this.shadowRoot.getElementById('add-ip');
    this.$roomNameDisplay = this.shadowRoot.getElementById('room-name-display');

    this.$addRoom.addEventListener('click', () => this.#createRoom());
    this.$addIp  .addEventListener('click', () => this.#addIp());

    this.#fetchRooms();
  }

  /* ---------- REST-Helper (Basis-URL voranstellen) ------ */
  async #fetchJSON(path, body) {
    path = `${HTTP_BASE}${path}`;                // <── einzig neue Zeile
    if (!body) path += (path.includes('?') ? '&' : '?') + '_=' + Date.now();
    const opt = body
      ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }
      : {};
    const res = await fetch(path, opt);
    return res.ok ? res.json() : null;
  }

  /* ---------- Räume -------------------------- */
  async #fetchRooms() {
    const list = await this.#fetchJSON('/rooms.json');
    if (list) this.state.rooms = list;
  }

  async #createRoom() {
    const name = this.$roomInp.value.trim();
    if (!name) return;
    const tmp = 'tmp-' + Math.random().toString(36).slice(2, 10);
    this.state.rooms = [...this.state.rooms, { hash: tmp, name }];
    this.$roomInp.value = '';
    const ok = await this.#fetchJSON('/admin/add-room', { name });
    if (!ok) {
      this.state.rooms = this.state.rooms.filter(r => r.hash !== tmp);
      alert('❌ Raum konnte nicht angelegt werden.');
    } else {
      this.#fetchRooms();
    }
  }

  async #removeRoom(hash) {
    const prev = [...this.state.rooms];
    this.state.rooms = prev.filter(r => r.hash !== hash);
    const ok = await this.#fetchJSON('/admin/remove-room', { hash });
    if (!ok) {
      this.state.rooms = prev;
      alert('❌ Raum konnte nicht gelöscht werden.');
    } else if (this.#currentHash === hash) {
      this.#currentHash = '';
      this.state.blocklist = [];
    }
  }

  /* ---------- Blocklist ---------------------- */
  async #selectRoom(hash, name) {
    this.#currentHash = hash;
    this.$roomNameDisplay.textContent = name;
    const ips = await this.#fetchJSON(`/blocklist.json?room=${hash}`);
    if (ips) this.state.blocklist = ips;
    /* Bubbling-Event an äußere Seite */
    this.dispatchEvent(new CustomEvent('room-selected', {
      detail : { hash, name },
      bubbles: true, composed: true
    }));
  }

  async #updateBlocklist(list) {
    const prev = [...this.state.blocklist];
    this.state.blocklist = list;
    const ok = await this.#fetchJSON('/admin/update-blocklist', { hash: this.#currentHash, list });
    if (!ok) {
      this.state.blocklist = prev;
      alert('❌ Konnte die Blockliste nicht speichern.');
    }
  }

  async #addIp() {
    const ip = this.$ipInp.value.trim();
    if (!ip || !this.#currentHash || this.state.blocklist.includes(ip)) return;
    await this.#updateBlocklist([...this.state.blocklist, ip]);
    this.$ipInp.value = '';
  }

  async #removeIp(ip) {
    await this.#updateBlocklist(this.state.blocklist.filter(x => x !== ip));
  }

  /* ---------- Render-Helpers ----------------- */
  #btn(label, cls, cb) {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = cls;
    b.onclick = cb;
    return b;
  }
  #btnCopy(text) {
    return this.#btn('⧉', 'copy', () =>
      navigator.clipboard.writeText(text).catch(() => this.#fallbackCopy(text))
    );
  }
  #fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  #span(cls, txt) {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = txt;
    return s;
  }

  /* ---------- Render-Pipelines --------------- */
  #renderRooms() {
    const list = this.state.rooms;
    this.$rooms.replaceChildren();
    list.forEach(({ hash, name }) => {
      const li = document.createElement('li');
      li.append(
        this.#btnCopy(hash),
        (() => {
          const wrap = document.createElement('div');
          wrap.className = 'room-main';

          const a = document.createElement('a');
          a.className = 'room-title room-link';
          a.href = `/chat.html/${hash}`;
          a.textContent = `💬 ${name}`;
          a.onclick = e => {
            e.preventDefault();
            this.#selectRoom(hash, name);
            this.shadowRoot.querySelectorAll('.room-title')
              .forEach(el => el.classList.toggle('selected', el === a));
          };
          if (hash === this.#currentHash) a.classList.add('selected');

          const h = document.createElement('div');
          h.className = 'hash';
          h.textContent = hash;

          wrap.append(a, h);
          return wrap;
        })(),
        this.#btn('✖', 'remove', () => this.#removeRoom(hash))
      );
      this.$rooms.append(li);
    });

    if (!this.#currentHash && list[0]) {
      this.#selectRoom(list[0].hash, list[0].name);
      this.shadowRoot.querySelector('.room-title')?.classList.add('selected');
    }
  }

  #renderBlocklist() {
    const ips = this.state.blocklist;
    this.$blocks.replaceChildren();
    if (!ips.length) {
      this.$blocks.innerHTML = '<li>Keine IPs blockiert</li>';
      return;
    }
    ips.forEach(ip => {
      const li = document.createElement('li');
      li.append(
        this.#span('ip-entry', ip),
        this.#btnCopy(ip),
        this.#btn('✖', 'remove', () => this.#removeIp(ip))
      );
      this.$blocks.append(li);
    });
  }

  #render(prop) {
    if (prop === 'rooms')      this.#renderRooms();
    if (prop === 'blocklist')  this.#renderBlocklist();
  }
}

customElements.define('chat-admin', ChatAdmin);
