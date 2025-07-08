import ChatController from './ChatController.js';

/* ---------- 0 | zentrale Basis-URL --------------------- */
const CFG       = window.ChatConfig || {};
const HTTP_BASE = CFG.httpBase
               || `${location.protocol}//${location.host}`;

/* Template laden */
async function loadTemplate() {
  const res = await fetch(`${HTTP_BASE}/components/chat-template.html`);
  if (!res.ok) throw new Error('template not found');
  return res.text();
}

/* Hash aus URL ziehen – akzeptiert /chat.html/<hash> UND /pages/chat.html/<hash> */
function hashFromPath() {
  const HASH_RE = /(?:\/pages)?\/chat(?:\.html)?\/([a-f0-9]{64})$/i;
  return HASH_RE.exec(location.pathname.replace(/\/{2,}/g, '/'))?.[1]?.toLowerCase() || '';
}

class ChatApp extends HTMLElement {
  static observedAttributes = ['room-hash', 'room-name'];

  constructor() { super(); this.attachShadow({ mode:'open' }); }

  async connectedCallback() {
    const tpl = document.createElement('template');
    tpl.innerHTML = await loadTemplate();
    tpl.content.querySelector('link[rel="stylesheet"]')
               .href = `${HTTP_BASE}/components/chat.css`;
    this.shadowRoot.append(tpl.content.cloneNode(true));

    /* Falls du <chat-app room-hash="…"> nutzt, ist alles gut.
       Wenn nicht, bleibt das alte Hash-Fallback wie gehabt. */
    const roomHash = this.getAttribute('room-hash')?.toLowerCase() || hashFromPath();
    if (!roomHash) return;           // kein redirect mehr auf /chat.html

    const roomName = this.getAttribute('room-name') || '';
    this._controller = new ChatController(this.shadowRoot, { roomHash, roomName });
  }

  attributeChangedCallback(name, _old, val) {
    this._controller?.updateConfig(
      name === 'room-hash' ? { roomHash: val } : { roomName: val }
    );
  }

  disconnectedCallback() { this._controller?.destroy(); }
}

customElements.define('chat-app', ChatApp);
export default ChatApp;
