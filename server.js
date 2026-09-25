const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const DERIV_URL = "wss://ws.derivws.com/websockets/v3?app_id=34uyXsvpWw49ADvhNsk3y";

// HTTP server (Render needs one to keep the service alive)
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("BinaryScope proxy is running.\n");
});

// WebSocket server for the browser to connect to
const wss = new WebSocket.Server({ server });

wss.on("connection", (client) => {
  console.log("Client connected");

  // Open connection to Deriv
  const deriv = new WebSocket(DERIV_URL);

  deriv.on("open", () => {
    console.log("Connected to Deriv");
  });

  // Browser → Deriv
  client.on("message", (msg) => {
    if (deriv.readyState === WebSocket.OPEN) {
      deriv.send(msg.toString());
    }
  });

  // Deriv → Browser
  deriv.on("message", (msg) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg.toString());
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    if (deriv.readyState === WebSocket.OPEN) deriv.close();
  });

  deriv.on("close", () => {
    console.log("Deriv disconnected");
    if (client.readyState === WebSocket.OPEN) client.close();
  });

  deriv.on("error", (err) => {
    console.error("Deriv error:", err.message);
  });
});

server.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`);
});
