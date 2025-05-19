const express = require("express");
const http = require("http");
const path = require("path");
const initWebSocket = require("./websocket");

const app = express();
const server = http.createServer(app);
initWebSocket(server);

app.use(express.static(path.join(__dirname, "../public")));

server.listen(3000, () => {
  console.log("Server läuft auf http://localhost:3000");
});