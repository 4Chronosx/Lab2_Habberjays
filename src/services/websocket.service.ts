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
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  PRESENCE_LIST: "presence:list",
  PRESENCE_JOINED: "presence:joined",
  PRESENCE_LEFT: "presence:left",
  DEBUG_PING: "debug:ping",
  DEBUG_PONG: "debug:pong",
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

// ─── Message Schema ───────────────────────────────────────────────────────────

export interface MessageActor {
  user_id: string;
  user_name: string;
  email: string;
  picture_url?: string;
  // backward compatibility
  userId?: string;
  name?: string;
}

export interface WebSocketMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string; // ISO 8601
  actor?: MessageActor;
}

// ─── Presence User Model ──────────────────────────────────────────────────────

export interface PresenceUser {
  user_id: string;
  user_name: string;
  email: string;
  picture_url?: string;
}

// ─── Client Tracking ──────────────────────────────────────────────────────────

const clients = new Set<AuthenticatedWebSocket>();
const clientPresence = new Map<AuthenticatedWebSocket, PresenceUser>();
const broadcastFingerprintByTypeAndTaskId = new Map<string, string>();

export function addClient(ws: AuthenticatedWebSocket, presenceUser: PresenceUser): void {
  clients.add(ws);
  clientPresence.set(ws, presenceUser);
}

export function removeClient(ws: AuthenticatedWebSocket): void {
  clients.delete(ws);
  clientPresence.delete(ws);
}

export function getPresenceUser(ws: AuthenticatedWebSocket): PresenceUser | undefined {
  return clientPresence.get(ws);
}

export function getConnectedUsers(): PresenceUser[] {
  return Array.from(clientPresence.values());
}

export function getActiveClientCount(): number {
  let count = 0;

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      count += 1;
    }
  }

  return count;
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

function normalizeMessage(
  message: Omit<WebSocketMessage, "timestamp"> & { timestamp?: string },
): WebSocketMessage {
  const normalized: WebSocketMessage = {
    type: message.type,
    payload: message.payload,
    timestamp: message.timestamp ?? new Date().toISOString(),
  };

  if (message.actor) {
    normalized.actor = message.actor;
  }

  return normalized;
}

function extractTaskId(payload: Record<string, unknown>): string | null {
  const id = payload.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function shouldApplyIdempotency(type: string): boolean {
  return (
    type === MessageType.TASK_CREATED ||
    type === MessageType.TASK_UPDATED ||
    type === MessageType.TASK_DELETED
  );
}

export function createWebSocketMessage(
  type: string,
  payload: Record<string, unknown>,
  actor?: MessageActor,
): WebSocketMessage {
  return normalizeMessage({
    type,
    payload,
    actor,
  });
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

export function broadcast(message: WebSocketMessage): number {
  const normalized = normalizeMessage(message);

  if (shouldApplyIdempotency(normalized.type)) {
    const taskId = extractTaskId(normalized.payload);

    if (taskId) {
      const idempotencyKey = `${normalized.type}:${taskId}`;
      const fingerprint = JSON.stringify(normalized);
      const previousFingerprint = broadcastFingerprintByTypeAndTaskId.get(
        idempotencyKey,
      );

      if (previousFingerprint === fingerprint) {
        return 0;
      }

      broadcastFingerprintByTypeAndTaskId.set(idempotencyKey, fingerprint);
    }
  }

  const serialized = JSON.stringify(normalized);
  let recipients = 0;

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
      recipients += 1;
    }
  }

  return recipients;
}

export function broadcastExcept(
  message: WebSocketMessage,
  excludeWs: AuthenticatedWebSocket,
): number {
  const normalized = normalizeMessage(message);
  const serialized = JSON.stringify(normalized);
  let recipients = 0;

  for (const client of clients) {
    if (client === excludeWs) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
      recipients += 1;
    }
  }

  return recipients;
}

export function broadcastTaskEvent(
  type:
    | typeof MessageType.TASK_CREATED
    | typeof MessageType.TASK_UPDATED
    | typeof MessageType.TASK_DELETED,
  payload: Record<string, unknown>,
  actor?: MessageActor,
): number {
  return broadcast(createWebSocketMessage(type, payload, actor));
}

export function logConnectedUsers(): void {
  const users = getConnectedUsers();
  console.log(
    `Connected users snapshot (${users.length}): ${JSON.stringify(users)}`,
  );
}

