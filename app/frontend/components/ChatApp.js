import ChatController from "./ChatController.js";
import { getBases, roomHashFromPath } from "../utils/env.js";

/* Template laden */
async function loadTemplate(HTTP_BASE) {
  const res = await fetch(`${HTTP_BASE}/components/chat-template.html`);
  if (!res.ok) throw new Error('template not found');
  return res.text();
}

class ChatApp extends HTMLElement {
  static observedAttributes = ['room-hash', 'room-name'];

  constructor() { super(); this.attachShadow({ mode:'open' }); }

  async connectedCallback() {
    const { http: HTTP_BASE, ws: WS_BASE } = getBases(this);   // <──  NEU
    const tpl = document.createElement('template');
    tpl.innerHTML = await loadTemplate(HTTP_BASE);
    tpl.content.querySelector('link[rel="stylesheet"]').href =
               `${HTTP_BASE}/components/chat.css`;
    this.shadowRoot.append(tpl.content.cloneNode(true));

    /* Falls du <chat-app room-hash="…"> nutzt, ist alles gut.
       Wenn nicht, bleibt das alte Hash-Fallback wie gehabt. */
    const roomHash = this.getAttribute('room-hash')?.toLowerCase() || roomHashFromPath();
    
    const roomName = this.getAttribute('room-name') || '';
    this._controller = new ChatController(this.shadowRoot, {
      roomHash, roomName,
      httpBase: HTTP_BASE,
      wsBase: WS_BASE
    });
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
