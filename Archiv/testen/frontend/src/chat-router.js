// Initialisiert <chat-app> anhand der URL  /chat/<hash>   oder   /chat.html/<hash>
import '/components/ChatApp.js';

function getRoomHash() {
  const m = location.pathname.match(/\/chat(?:\.html)?\/([a-f0-9]{64})$/i);
  return m?.[1]?.toLowerCase() ?? '';
}

function init() {
  const hash = getRoomHash();
  if (!hash) {
    location.replace('/chat.html');      // Fallback: zurück zur Startseite
    return;
  }

  const app = document.querySelector('chat-app');
  app.setAttribute('room-hash', hash);     // Raum-Hash injizieren
}

document.addEventListener('DOMContentLoaded', init);
