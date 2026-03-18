import { WebSocket } from "ws";

export interface AuthenticatedWebSocket extends WebSocket {
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

export const MessageType = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_MOVED: "TASK_MOVED",
  TASK_DELETED: "TASK_DELETED",
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

export interface WebSocketMessage {
  type: MessageTypeValue;
  payload: Record<string, unknown>;
  timestamp: string; // ISO 8601
}

const clients = new Set<AuthenticatedWebSocket>();

export function addClient(ws: AuthenticatedWebSocket): void {
  clients.add(ws);
}

export function removeClient(ws: AuthenticatedWebSocket): void {
  clients.delete(ws);
}

export function broadcast(message: WebSocketMessage): void {
  const serialized = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}
