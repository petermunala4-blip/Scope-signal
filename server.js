const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const DerivAPIBasic = require("@deriv/deriv-api/dist/DerivAPIBasic.js");

const PORT = process.env.PORT || 8080;
const APP_ID = "34uyXsvpWw49ADvhNsk3y";

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

  const connection = new WebSocket(
    `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`
  );
  const api = new DerivAPIBasic({ connection });

  client.on("message", async (msg) => {
    let payload;
    try {
      payload = JSON.parse(msg.toString());
    } catch (e) {
      console.error("Invalid JSON from client:", msg.toString());
      return;
    }

    try {
      if (payload.ticks) {
        // Use the official library's subscribe method
        const tickStream = await api.subscribe({ ticks: payload.ticks, subscribe: 1 });
        tickStream.subscribe({
          next: (data) => {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
          },
          error: (err) => console.error("Tick stream error:", err),
        });
      } else {
        // Handle other request types if needed in the future
        const result = await api.send(payload);
        if (result && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(result));
        }
      }
    } catch (err) {
      console.error("Deriv error:", err.message || err);
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ error: err.error || { message: err.message } }));
      }
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    if (connection.readyState === WebSocket.OPEN) connection.close();
  });

  connection.on("close", () => {
    if (client.readyState === WebSocket.OPEN) client.close();
  });

  connection.on("error", (err) => {
    console.error("Deriv connection error:", err.message);
  });
});

server.listen(PORT, () => console.log(`Proxy on port ${PORT}`));
