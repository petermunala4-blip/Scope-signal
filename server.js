const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const DERIV_URL = "wss://ws.derivws.com/websockets/v3?app_id=34uyXsvpWw49ADvhNsk3y";

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
  res.end("BinaryScope proxy is running.\n");
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (client) => {
  console.log("Client connected");
  const deriv = new WebSocket(DERIV_URL, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://scope-signal-proxy.onrender.com"
  }
});
  const buffer = [];

  deriv.on("open", () => {
    console.log("Connected to Deriv - flushing " + buffer.length + " msgs");
    buffer.forEach(msg => deriv.send(msg));
    buffer.length = 0;
  });

  client.on("message", (msg) => {
    if (deriv.readyState === WebSocket.OPEN) {
      deriv.send(msg.toString());
    } else {
      buffer.push(msg.toString());
    }
  });

  deriv.on("message", (msg) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg.toString());
  });

  client.on("close", () => {
    console.log("Client disconnected");
    if (deriv.readyState === WebSocket.OPEN) deriv.close();
  });

  deriv.on("close", () => {
    if (client.readyState === WebSocket.OPEN) client.close();
  });

  deriv.on("error", (err) => console.error("Deriv error:", err.message));
});

server.listen(PORT, () => console.log("Proxy on port " + PORT));
