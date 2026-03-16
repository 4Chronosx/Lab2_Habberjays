import { WebSocket } from "ws";

// ─── Authenticated WebSocket ──────────────────────────────────────────────────

export interface AuthenticatedWebSocket extends WebSocket {
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

// ─── Message Types ────────────────────────────────────────────────────────────

export const MessageType = {
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_MOVED: "TASK_MOVED",
  TASK_DELETED: "TASK_DELETED",
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

// ─── Message Schema ───────────────────────────────────────────────────────────

export interface WebSocketMessage {
  type: MessageTypeValue;
  payload: Record<string, unknown>;
  timestamp: string; // ISO 8601
}

// ─── Client Tracking ──────────────────────────────────────────────────────────

const clients = new Set<AuthenticatedWebSocket>();

export function addClient(ws: AuthenticatedWebSocket): void {
  clients.add(ws);
}

export function removeClient(ws: AuthenticatedWebSocket): void {
  clients.delete(ws);
}

// ─── Validation ───────────────────────────────────────────────────────────────

const validTypes = new Set<string>(Object.values(MessageType));

export function isValidMessage(data: unknown): data is WebSocketMessage {
  if (typeof data !== "object" || data === null) return false;

  const msg = data as Record<string, unknown>;

  if (typeof msg.type !== "string" || !validTypes.has(msg.type)) return false;
  if (typeof msg.payload !== "object" || msg.payload === null) return false;
  if (typeof msg.timestamp !== "string") return false;

  return true;
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

export function broadcast(message: WebSocketMessage): void {
  const serialized = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}
