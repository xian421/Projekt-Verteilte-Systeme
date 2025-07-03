import { ChatApp } from './chat.js';

class ChatComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const roomHash = this.getAttribute('room-hash') || '';
    const roomName = this.getAttribute('room-name') || '';

    // Für Kompatibilität mit bestehendem Code
    window.ROOM_HASH = roomHash;
    window.ROOM_NAME = roomName;

    // HTML-Template in ShadowDOM einfügen
    const res = await fetch('/chat-ui.html'); // Dieses neue Template erstellen wir gleich
    const html = await res.text();
    const template = document.createElement('template');
    template.innerHTML = html;

 this.shadowRoot.appendChild(template.content.cloneNode(true));

  // Warten bis DOM-Content im ShadowDOM verarbeitet ist
  requestAnimationFrame(() => {
    new ChatApp(this.shadowRoot);
  });

  }
}

customElements.define('chat-app', ChatComponent);
