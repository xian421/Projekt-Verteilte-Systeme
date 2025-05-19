// === chat.js ===

// WebSocket-Verbindung
const ws = new WebSocket("ws://localhost:3000");
// wir erwarten standardmäßig Blob bei Binärdaten
ws.binaryType = "blob";

// DOM-Elemente
const form    = document.getElementById("chat-form");
const input   = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");

// Hilfsfunktion: neue Chat-Nachricht in den DOM packen
const appendMessage = text => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("chat-message");
  msgDiv.textContent = text;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;  // Auto-Scroll
};

// Formular-Absendelogik
form.addEventListener("submit", e => {
  e.preventDefault();
  const message = input.value.trim();
  if (!message) return;
  
  // Optional: hier könnte man noch JSON senden, z.B. 
  // const payload = JSON.stringify({ user: "Christian", text: message });
  // ws.send(payload);
  
  ws.send(message);
  input.value = "";
});

// Empfang von Nachrichten
ws.addEventListener("message", async event => {
  let text;

  if (event.data instanceof Blob) {
    // Blob in Text umwandeln
    text = await event.data.text();
  } else if (event.data instanceof ArrayBuffer) {
    // ArrayBuffer in String decodieren
    const decoder = new TextDecoder("utf-8");
    text = decoder.decode(event.data);
  } else {
    // String-Fall
    text = event.data;
  }

  appendMessage(text);
});

// Fehler-Handling (optional)
ws.addEventListener("error", err => {
  console.error("WebSocket-Fehler:", err);
  appendMessage("⚠️ Verbindungsfehler – siehe Konsole.");
});

// Connection-Status (optional)
ws.addEventListener("open", () => appendMessage("✅ Verbindung aufgebaut."));
ws.addEventListener("close", () => appendMessage("🔌 Verbindung getrennt."));
