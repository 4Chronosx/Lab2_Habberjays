import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

export function initWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to Kanban WebSocket server",
      }),
    );

    ws.on("message", (data) => {
      console.log("WebSocket message received:", data.toString());
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return wss;
}
