// frontend/components/AdminPanel.js
// ---------------------------------
import bus from "../utils/bus.js";
import { getBases } from "../utils/env.js";

export default class ChatAdmin extends HTMLElement {
  /* ------------ State ---------------------------------- */
  state = new Proxy({ rooms: [], blocklist: [] }, {
    set: (o, p, v) => (o[p] = v, this.#render(p), true)
  });

  #currentHash = "";
  #isLoggedIn  = false;
  #panelInitialized = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  /* ------------ Lifecycle ------------------------------ */
  async connectedCallback() {
    const { http: HTTP_BASE } = getBases(this);
    const tplHtml = await fetch(`${HTTP_BASE}/components/admin-template.html`)
      .then(res => {
        if (!res.ok) throw new Error("template not found");
        return res.text();
      });
    const tpl = document.createElement("template");
    tpl.innerHTML = tplHtml;
    tpl.content.querySelector("link[rel=stylesheet]").href =
      `${HTTP_BASE}/components/admin.css`;
    this.shadowRoot.append(tpl.content.cloneNode(true));

    /* Auth-DOM */
    this.$authScreen   = this.shadowRoot.getElementById("auth-screen");
    this.$authPassword = this.shadowRoot.getElementById("auth-password");
    this.$authSubmit   = this.shadowRoot.getElementById("auth-submit");
    this.$authError    = this.shadowRoot.getElementById("auth-error");
    this.$panelTpl     = this.shadowRoot.getElementById("panel-tpl");

    /* Auth-Events */
    this.$authSubmit.addEventListener("click", () => this.#handleLogin());
    this.$authPassword.addEventListener("keypress",
      e => e.key === "Enter" && this.#handleLogin());

    if (localStorage.getItem("adminToken")) {
      this.#showPanel();
    }
  }

  /* ------------ Auth-Flow ------------------------------ */
  async #handleLogin() {
    const pwd = this.$authPassword.value.trim();
    if (!pwd) return;
    try {
      const { http: HTTP_BASE } = getBases(this);
      const res = await fetch(`${HTTP_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd })
      });
      if (!res.ok) throw new Error();
      const { data: { token } } = await res.json();
      localStorage.setItem("adminToken", token);
      this.#showPanel();
    } catch {
      this.#showError("❌ Falsches Passwort");
    }
  }

  #showError(msg) {
    this.$authError.textContent = msg;
    this.$authError.hidden = false;
    this.$authPassword.value = "";
    setTimeout(() => (this.$authError.hidden = true), 3000);
  }

  /* ------------ Panel-Init ----------------------------- */
  #showPanel() {
    if (this.#panelInitialized) return;
    this.#panelInitialized = true;
    this.#isLoggedIn = true;

    this.classList.add("admin-panel");
    this.$authScreen.hidden = true;

    /* Panel-DOM einblenden & cachen */
    this.shadowRoot.append(this.$panelTpl.content.cloneNode(true));
    this.$rooms           = this.shadowRoot.getElementById("rooms-list");
    this.$blocks          = this.shadowRoot.getElementById("blocklist");
    this.$roomInp         = this.shadowRoot.getElementById("room-name");
    this.$addRoom         = this.shadowRoot.getElementById("add-room");
    this.$ipInp           = this.shadowRoot.getElementById("block-ip");
    this.$addIp           = this.shadowRoot.getElementById("add-ip");
    this.$roomNameDisplay = this.shadowRoot.getElementById("room-name-display");

    /* Events */
    this.$addRoom.addEventListener("click", () => this.#createRoom());
    this.$addIp  .addEventListener("click", () => this.#addIp());

    this.#fetchRooms();
  }

  /* ------------ Helpers ------------------------------- */
  getToken() {
    return localStorage.getItem("adminToken");
  }

  async #fetchRooms() {
    try {
      const { http: HTTP_BASE } = getBases(this);
      const res = await fetch(`${HTTP_BASE}/rooms.json`);
      const { data } = await res.json();
      this.state.rooms = data;
    } catch (e) {
      console.error("Fehler beim Laden der Räume:", e);
    }
  }

  /* ------------ Räume ---------------------------------- */
  async #createRoom() {
    const name = this.$roomInp.value.trim();
    if (!name) return;
    const tmp = "tmp-" + Math.random().toString(36).slice(2,10);
    this.state.rooms = [...this.state.rooms, { hash: tmp, name }];
    this.$roomInp.value = "";

    try {
      const { http: HTTP_BASE } = getBases(this);
      const token = this.getToken();
      const res = await fetch(`${HTTP_BASE}/admin/add-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name })
      });
      if (!res.ok) throw new Error("Konnte Raum nicht anlegen");
      const { data: { hash } } = await res.json();
      await this.#fetchRooms();
      const newRoom = this.state.rooms.find(r => r.hash === hash);
      if (newRoom) {
        this.#selectRoom(hash, newRoom.name);
        this.shadowRoot.querySelectorAll(".room-title")
          .forEach(el => el.classList.toggle("selected", el.textContent.includes(newRoom.name)));
      }
    } catch (e) {
      this.state.rooms = this.state.rooms.filter(r => r.hash !== tmp);
      alert("❌ Raum konnte nicht angelegt werden: " + e.message);
    }
  }

  async #removeRoom(hash) {
    if (!confirm("Diesen Raum wirklich löschen?")) return;
    const backup = [...this.state.rooms];
    this.state.rooms = backup.filter(r => r.hash !== hash);

    try {
      const { http: HTTP_BASE } = getBases(this);
      const token = this.getToken();
      const res = await fetch(`${HTTP_BASE}/admin/remove-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, hash })
      });
      if (!res.ok) throw new Error("Konnte Raum nicht löschen");
      if (hash === this.#currentHash) {
        if (this.state.rooms.length) {
          const { hash: h, name } = this.state.rooms[0];
          this.#selectRoom(h, name);
        } else {
          this.#currentHash = "";
          this.state.blocklist = [];
          this.$roomNameDisplay.textContent = "";
        }
      }
    } catch (e) {
      this.state.rooms = backup;
      alert("❌ Raum konnte nicht gelöscht werden: " + e.message);
    }
  }

  /* ------------ Block-/Ban-Logik ----------------------- */
  async #selectRoom(hash, name) {
    if (!hash) return;
    this.#currentHash = hash;
    this.$roomNameDisplay.textContent = name;

    try {
      const { http: HTTP_BASE } = getBases(this);
      const res = await fetch(`${HTTP_BASE}/blocklist.json?room=${hash}`);
      const { data } = await res.json();
      this.state.blocklist = data;
    } catch (e) {
      console.error("Fehler beim Laden der Blocklist:", e);
      this.state.blocklist = [];
    }
    this.#updateBanButtonState();

    const payload = { hash, name };
    this.dispatchEvent(new CustomEvent('room-selected', {
      detail: payload, bubbles: true, composed: true
    }));
    bus.emit("room-selected", payload);
  }

  async #updateBlocklist(list) {
    if (!this.#currentHash) return false;
    const prev = [...this.state.blocklist];
    try {
      const { http: HTTP_BASE } = getBases(this);
      const token = this.getToken();
      const res = await fetch(`${HTTP_BASE}/admin/update-blocklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, hash: this.#currentHash, list })
      });
      if (!res.ok) throw new Error("Konnte Blocklist nicht speichern");
      this.state.blocklist = list;
      return true;
    } catch (e) {
      console.error("Fehler beim Speichern:", e);
      this.state.blocklist = prev;
      alert("❌ Konnte die Blockliste nicht speichern: " + e.message);
      return false;
    }
  }

  async #addIp() {
    const ip = this.$ipInp.value.trim();
    if (!ip) return alert("❌ Bitte IP-Adresse eingeben");
    if (this.state.blocklist.includes(ip))
      return alert("❌ Diese IP ist bereits blockiert");

    const ok = await this.#updateBlocklist([...this.state.blocklist, ip]);
    if (ok) this.$ipInp.value = "";
  }

  async #removeIp(ip) {
    await this.#updateBlocklist(this.state.blocklist.filter(x => x !== ip));
  }

  #updateBanButtonState() {
    const dis = !this.#currentHash;
    if (this.$addIp) {
      this.$addIp.disabled    = dis;
      this.$ipInp.disabled    = dis;
      this.$ipInp.placeholder = dis ? "Erst Raum auswählen …" : "IP-Adresse eingeben";
    }
  }

  /* ------------ Render-Helpers + Pipelines -------------- */
  #btn(label, cls, cb) {
    const b = document.createElement("button");
    b.textContent = label; b.className = cls; b.onclick = cb; return b;
  }

  #btnCopy(text) {
    return this.#btn("⧉", "copy", () => navigator.clipboard.writeText(text));
  }

  #span(c, t) {
    return Object.assign(document.createElement("span"), { className: c, textContent: t });
  }

  #renderRooms() {
    if (!this.$rooms) return;
    this.$rooms.replaceChildren();
    this.state.rooms.forEach(({ hash, name }) => {
      const li = document.createElement("li");
      li.append(this.#btnCopy(hash));

      const wrap = Object.assign(document.createElement("div"), { className: "room-main" });
      const a = Object.assign(document.createElement("a"), {
        className: "room-title room-link",
        href: `/chat.html/${hash}`,
        textContent: `💬 ${name}`
      });
      a.onclick = e => {
        e.preventDefault();
        this.#selectRoom(hash, name);
        this.shadowRoot.querySelectorAll(".room-title")
          .forEach(el => el.classList.toggle("selected", el === a));
      };
      if (hash === this.#currentHash) a.classList.add("selected");
      wrap.append(a, this.#span("hash", hash));
      li.append(wrap, this.#btn("✖", "remove", () => this.#removeRoom(hash)));
      this.$rooms.append(li);
    });
    if (!this.#currentHash && this.state.rooms[0]) {
      const { hash, name } = this.state.rooms[0];
      this.#selectRoom(hash, name);
      this.shadowRoot.querySelector(".room-title")?.classList.add("selected");
    }
  }

  #renderBlocklist() {
    if (!this.$blocks) return;
    this.$blocks.replaceChildren();
    if (!this.state.blocklist.length) {
      this.$blocks.innerHTML = "<li>Keine IPs blockiert</li>";
      return;
    }
    this.state.blocklist.forEach(ip => {
      const li = document.createElement("li");
      li.append(
        this.#span("ip-entry", ip),
        this.#btnCopy(ip),
        this.#btn("✖", "remove", () => this.#removeIp(ip))
      );
      this.$blocks.append(li);
    });
  }

  #render(prop) {
    if (prop === "rooms") this.#renderRooms();
    if (prop === "blocklist") this.#renderBlocklist();
  }
}

customElements.define("chat-admin", ChatAdmin);
