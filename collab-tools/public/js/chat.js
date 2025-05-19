const ws = new WebSocket("ws://localhost:3000"); // passt du ggf. an

const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const chatBox = document.getElementById("chat-box");

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message !== "") {
    ws.send(message);
    input.value = "";
  }
});

ws.addEventListener("message", function (event) {
  const message = event.data;
  const msgDiv = document.createElement("div");
  msgDiv.textContent = message;
  msgDiv.classList.add("chat-message");
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight; // auto-scroll
});
