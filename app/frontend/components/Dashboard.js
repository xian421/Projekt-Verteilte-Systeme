// frontend/components/Dashboard.js
import "./AdminPanel.js";
import "./ChatApp.js";
import bus from "../utils/bus.js";

customElements.define('chat-dashboard', class extends HTMLElement {
  #hash = '';
  #name = '';

  constructor() { super().attachShadow({mode:'open'}); }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:grid; height:100dvh;
                grid-template-columns: minmax(18rem, 28rem) 1fr; }
        @container (max-width: 820px) {
          :host { grid-template-columns: 1fr; }
        }
        chat-admin { border-right:1px solid #e5e7eb; height:100%; }
        chat-app   { height:100%; }
      </style>
      <chat-admin></chat-admin>
      <chat-app></chat-app>
    `;

    const chat  = this.shadowRoot.querySelector("chat-app");

    this._handler = e => {
      this.#hash = e.detail.hash;
      this.#name = e.detail.name;
      chat.setAttribute("room-hash", this.#hash);
      chat.setAttribute("room-name", this.#name);
    };
    bus.on("room-selected", this._handler);

    /* 2) Fallback: wenn Chat geladen wird und Hash leer ist,
          zeigt er automatisch sein internes Token‑Formular
          (s. nächste Code‑Änderung). */
  }

  disconnectedCallback() { bus.off("room-selected", this._handler); }
});
