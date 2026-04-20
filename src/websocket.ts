import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse as parseUrl } from "url";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import {
  AuthenticatedWebSocket,
  addClient,
  removeClient,
  createWebSocketMessage,
  MessageType,
  getConnectedUsers,
  getPresenceUser,
  getActiveClientCount,
  logConnectedUsers,
  broadcast,
  broadcastExcept,
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
      const presenceUser = {
        user_id: payload.userId,
        user_name: payload.name || payload.email,
        email: payload.email,
        picture_url: (payload as any).picture_url || (payload as any).pictureUrl,
      };

      console.log(`WebSocket authenticated: ${payload.email} ${payload}`);

      ws.send(
        JSON.stringify(
          createWebSocketMessage("welcome", {
            message: "Connected to Kanban WebSocket server",
          }),
        ),
      );

      addClient(ws as AuthenticatedWebSocket, presenceUser);

      const connectedUsers = getConnectedUsers();
      const listMessage = createWebSocketMessage(MessageType.PRESENCE_LIST, {
        clients: connectedUsers,
      });
      ws.send(JSON.stringify(listMessage));
      console.log(
        `presence:list sent count=${connectedUsers.length} to ${payload.email}`,
      );

      const joinedMessage = createWebSocketMessage(MessageType.PRESENCE_JOINED, {
        client: presenceUser,
      });
      const joinedRecipients = broadcastExcept(joinedMessage, ws as AuthenticatedWebSocket);
      console.log(`presence:joined recipients=${joinedRecipients}`);

      const activeCount = getActiveClientCount();
      console.log(`WS auth success: user=${payload.email} connected=${activeCount}`);
    } catch (error) {
      ws.close(4001, "Unauthorized: Invalid or expired token");
      console.log("WebSocket connection rejected: Token verification failed");
      return;
    }

    ws.on("message", (data) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        ws.send(
          JSON.stringify(
            createWebSocketMessage("error", { message: "Invalid JSON" }),
          ),
        );
        return;
      }

      const type =
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as { type?: unknown }).type === "string"
          ? (parsed as { type: string }).type
          : "unknown";

      console.log(`Inbound WS message received: type=${type}`);

      if (type === MessageType.DEBUG_PING) {
        ws.send(
          JSON.stringify(createWebSocketMessage(MessageType.DEBUG_PONG, {})),
        );
        return;
      }

      ws.send(
        JSON.stringify(
          createWebSocketMessage("error", {
            message: "Unsupported debug message type",
            expected: MessageType.DEBUG_PING,
          }),
        ),
      );
    });

    ws.on("close", () => {
      const leavingUser = getPresenceUser(ws as AuthenticatedWebSocket);
      console.log("WebSocket client disconnected", leavingUser?.email || "unknown");

      removeClient(ws as AuthenticatedWebSocket);

      if (leavingUser) {
        const leftMessage = createWebSocketMessage(MessageType.PRESENCE_LEFT, {
          client: leavingUser,
        });
        const leftRecipients = broadcast(leftMessage);
        console.log(`presence:left recipients=${leftRecipients}`);
      }
    });

    ws.on("error", (error) => {
      const leavingUser = getPresenceUser(ws as AuthenticatedWebSocket);
      console.error("WebSocket error:", error, leavingUser?.email || "unknown");

      removeClient(ws as AuthenticatedWebSocket);

      if (leavingUser) {
        const leftMessage = createWebSocketMessage(MessageType.PRESENCE_LEFT, {
          client: leavingUser,
        });
        const leftRecipients = broadcast(leftMessage);
        console.log(`presence:left recipients=${leftRecipients}`);
      }
    });
  });

  return wss;
}
