import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseUrl } from "url";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import {
  AuthenticatedWebSocket,
  addClient,
  removeClient,
  isValidMessage,
  broadcast,
} from "./services/websocket.service";

export function initWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
    try {
      const url = parseUrl(request.url || "", true);
      const token = url.query.token as string;

      if (!token) {
        ws.close(4001, "Unauthorized: Missing token");
        console.log("WebSocket connection rejected: No token provided");
        return;
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email: string;
        name: string;
      };

      (ws as AuthenticatedWebSocket).user = payload;
      console.log(`WebSocket authenticated: ${payload.email}`);
    } catch (error) {
      ws.close(4001, "Unauthorized: Invalid or expired token");
      console.log("WebSocket connection rejected: Token verification failed");
      return;
    }

    ws.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to Kanban WebSocket server",
      }),
    );

    addClient(ws as AuthenticatedWebSocket);

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
      removeClient(ws as AuthenticatedWebSocket);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      removeClient(ws as AuthenticatedWebSocket);
    });
  });

  return wss;
}
