// chat.js

const HASH_RE = /^\/chat\.html\/([a-f0-9]{64})$/i;
const roomHash = (() => {
  const fromPath = HASH_RE.exec(location.pathname.replace(/\/{2,}/g, "/"))?.[1];
  return (window.ROOM_HASH || fromPath || "").toLowerCase();
})();

if (!roomHash) location.assign("/chat.html");
const WS_URL = `ws://${location.host}/${roomHash}`;
const prettyName = window.ROOM_NAME || roomHash;

export class ChatApp {
    #ws; #userName = ""; #joined = false; #wasBlocked = false; #tooManyConnections = false;
  constructor(root) {
    this.root = root;
    this.$roomNameDisplay = root.querySelector("#room-name-display");
    this.$nameInput   = root.querySelector("#name-input");
    this.$startBtn    = root.querySelector("#start-btn");
    this.$chatForm    = root.querySelector("#chat-form");
    this.$chatInput   = root.querySelector("#chat-input");
    this.$sendBtn     = root.querySelector("#send-btn");
    this.$userDisplay = root.querySelector("#user-display");
    this.$chatBox     = root.querySelector("#chat-box");
    this.$nameSec     = root.querySelector("#name-form");
    this.$chatSec     = root.querySelector("#chat-ui");
    this.$blockedSec  = root.querySelector("#blocked-ui");
    this.$editBtn     = root.querySelector("#edit-name");
    this.$tooManyConnectionsSec = root.querySelector("#too-many-connections-ui");

    this.#bindDOM();
    this.#connect();
    this._loadRoomName();

    const saved = localStorage.getItem("chatName");
    if (saved) this.#autoJoin(saved);
  }

  #connect() {
    this.#ws = new WebSocket(WS_URL);
    this.#ws.addEventListener("message", e => this.#handleMessage(e.data));
    this.#ws.addEventListener("close", e => {
      if (e.code === 4000) return this.#handleBlocked();
      if (e.code === 4001) return this.#handleTooManyConnections();
      if (!this.#wasBlocked) {
        this.#appendSystem("⚠️ Verbindung getrennt – reconnect …");
        setTimeout(() => !this.#wasBlocked && this.#connect(), 2000);
      }
    });
  }

  #bindDOM() {
    this.$startBtn.addEventListener("click", () => this.#join());
    this.$nameInput.addEventListener("keypress", e => e.key === "Enter" && this.#join());
    this.$chatForm.addEventListener("submit", e => {
      e.preventDefault();
      if (!this.#userName) return this.#bounce(this.$nameInput);
      const msg = this.$chatInput.value.trim();
      if (!msg) return;
      this.#ws.send(JSON.stringify({ type: "chat", message: msg }));
      this.$chatInput.value = "";
    });
    this.$editBtn.addEventListener("click", () => this.#changeName());
  }

  #autoJoin(name) {
    this.#userName = name;
    this.$nameInput.value = name;
    this.$nameSec.hidden = true;
    this.$chatSec.hidden = false;
    this.$sendBtn.removeAttribute("disabled");
    this.$userDisplay.textContent = `👤 ${name}`;
    this.$editBtn.hidden = false;
    if (this.#joined) return;
    if (this.#ws.readyState === WebSocket.OPEN) {
      this.#sendJoin(name);
    } else {
      this.#ws.addEventListener("open", () => {
        if (!this.#joined) this.#sendJoin(name);
      }, { once: true });
    }
  }

  #join() {
    const name = this.$nameInput.value.trim();
    if (!name) return this.#bounce(this.$nameInput);
    this.#autoJoin(name);
  }

  #sendJoin(name) {
    this.#ws.send(JSON.stringify({ type: "join", name }));
    this.#joined = true;
    localStorage.setItem("chatName", name);
  }

  #changeName() {
    const newName = prompt("Neuer Name:", this.#userName)?.trim();
    if (!newName || newName === this.#userName) return;
    this.#ws.send(JSON.stringify({ type: "changeName", newName }));
    this.$userDisplay.textContent = `👤 ${newName}`;
    this.#userName = newName;
    localStorage.setItem("chatName", newName);
  }

  #handleMessage(raw) {
    let obj;
    try { obj = JSON.parse(raw); } catch {/* not JSON */}
    if (obj?.type === "system") return this.#appendSystem(obj.text);
    this.#appendChat(raw);
  }

  #appendChat(text) {
    const el = document.createElement("div");
    el.className = "chat-message";
    el.innerHTML  = text;        // HTML erlaubt jetzt das span
    this.$chatBox.append(el);
    this.$chatBox.scrollTop = this.$chatBox.scrollHeight;
  }

  #appendSystem(text) {
    const el = document.createElement("div");
    el.className = "system-message";
    el.innerHTML  = text;        // HTML erlaubt jetzt das span
    this.$chatBox.append(el);
    this.$chatBox.scrollTop = this.$chatBox.scrollHeight;
  }

  #bounce(el) {
    el.focus();
    el.animate({ transform: ["translateX(0)", "translateX(-4px)", "translateX(4px)", "translateX(0)"] },
               { duration: 300, easing: "ease-in-out" });
  }

  #handleBlocked() {
    this.#wasBlocked = true;
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$blockedSec.hidden = false;
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent = "";
  }

  #handleTooManyConnections() {
    this.#tooManyConnections = true;
    this.$nameSec.hidden = this.$chatSec.hidden = true;
    this.$tooManyConnectionsSec.hidden = false;
    this.$editBtn.hidden = true;
    this.$userDisplay.textContent = "Zu viele Verbindungen – bitte später erneut versuchen.";
  }

  async _loadRoomName() {
    try {
      const res = await fetch("/rooms.json");
      if (!res.ok) throw new Error("Fehler beim Laden von rooms.json");
      const allRooms = await res.json();
      const current = allRooms.find(r => r.hash.toLowerCase() === roomHash);
      this.$roomNameDisplay.textContent = current ? `💬 ${current.name}` : `💬 ${roomHash}`;
    } catch {
      this.$roomNameDisplay.textContent = `💬 ${roomHash}`;
    }
  }
}

// Admin-Reaktion
document.addEventListener("admin-login", () => {
  console.log("Admin-Modus erkannt – IP-Infos werden eingeblendet");
  document.querySelectorAll(".ip-info").forEach(el => el.classList.remove("hidden"));
});

// BFCache Workaround
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});


