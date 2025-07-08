// Initialisiert <chat-app> anhand der URL  /chat/<hash>   oder   /chat.html/<hash>
import "/components/ChatApp.js";
import { roomHashFromPath } from "../utils/env.js";
import bus from "../utils/bus.js";

function init() {
  const hash = roomHashFromPath();
  
  const app = document.querySelector('chat-app');
  if (hash) {
    app.setAttribute('room-hash', hash);     // Raum-Hash injizieren
    bus.emit("room-selected", { hash, name:"" });    // AdminPanel evtl. gar nicht offen
  }
  // Kein Redirect mehr - Token-Form wird angezeigt, wenn kein Hash vorhanden
}

document.addEventListener('DOMContentLoaded', init);
