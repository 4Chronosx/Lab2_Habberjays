import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import {
  addClient,
  removeClient,
  isValidMessage,
  broadcast,
} from "./services/websocket.service";

export function initWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");
    addClient(ws);

    ws.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to Kanban WebSocket server",
      }),
    );

    ws.on("message", (data) => {
      console.log("WebSocket message received:", data.toString());

      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      if (!isValidMessage(parsed)) {
        ws.send(
          JSON.stringify({
            error: "Invalid message schema",
            expected: {
              type: "TASK_CREATED | TASK_UPDATED | TASK_MOVED | TASK_DELETED",
              payload: {},
              timestamp: "ISO 8601 string",
            },
          }),
        );
        return;
      }

      broadcast(parsed);
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      removeClient(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      removeClient(ws);
    });
  });

  return wss;
}
