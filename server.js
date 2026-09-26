const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const APP_ID = "34uyXsvpWw49ADvhNsk3y";
const DERIV_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`;

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) { res.writeHead(500); res.end("Error loading page"); return; }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Even/Odd proxy is running.\n");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (client) => {
  console.log("Client connected");

  // Use Node v22 native WebSocket (undici) — browser-like TLS fingerprint
  const deriv = new globalThis.WebSocket(DERIV_URL);

  const buffer = [];

  deriv.addEventListener("open", () => {
    console.log("Connected to Deriv — flushing " + buffer.length + " msgs");
    buffer.forEach(msg => deriv.send(msg));
    buffer.length = 0;
  });

  client.on("message", (msg) => {
    if (deriv.readyState === globalThis.WebSocket.OPEN) {
      deriv.send(msg.toString());
    } else {
      buffer.push(msg.toString());
    }
  });

  deriv.addEventListener("message", (event) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(event.data);
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    if (deriv.readyState === globalThis.WebSocket.OPEN) deriv.close();
  });

  deriv.addEventListener("close", () => {
    console.log("Deriv connection closed");
    if (client.readyState === WebSocket.OPEN) client.close();
  });

  deriv.addEventListener("error", (err) => {
    console.error("Deriv error:", err.message || err);
  });
});

server.listen(PORT, () => console.log("Proxy on port " + PORT));
