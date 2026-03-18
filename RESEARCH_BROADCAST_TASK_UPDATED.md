# Research Plan: Broadcast task:updated Event to All Clients

**Date:** March 18, 2026  
**Feature:** Emit a real-time event when a task is updated or moved between columns  
**Branch:** `23-broadcast-taskupdated-event-to-all-clients`

---

## Executive Summary

**Current Status:** ✅ All foundational infrastructure exists (WebSocket, JWT auth, task:created broadcast)  
**Missing Component:** ❌ No task update endpoint exists yet  
**Confidence Level:** 80%

**Key Finding:** The project has a fully functional WebSocket broadcast system with JWT authentication. The `task:created` event is already implemented and working. However, **no task update endpoint exists** in the codebase. This feature requires creating the update endpoint first, then adding the broadcast logic.

**Discrepancy Alert:** The acceptance criteria mentions `POST /tasks` but the actual endpoint pattern is `POST /task/add`. A task update endpoint should follow the same pattern (likely `/task/update/:id` or similar).

---

## 1. Code Context

### 1.1 Task Controller (from dev branch)

**File:** `src/controller/task.controller.ts`

**Current Implementation:**

```typescript
import { TaskService } from "../services/task.service";
import { Response } from "express";
import { AuthRequest } from "../middleware/middleware";
import { broadcast, MessageType } from "../services/websocket.service";

export const addTask = async (req: AuthRequest, res: Response) => {
  const task = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.add(task, userId);

    // ─── Broadcast to all connected WebSocket clients ────────────
    broadcast({
      type: MessageType.TASK_CREATED,
      payload: result,
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
```

**Status:** ✅ Exists and working  
**Pattern to Follow:** The `addTask` function shows the exact pattern needed for update:

1. Authenticate user (`req.user?.userId`)
2. Call service method
3. Broadcast WebSocket event
4. Return JSON response

**Missing:** No `updateTask` function exists

---

### 1.2 Task Service (from dev branch)

**File:** `src/services/task.service.ts`

**Current Implementation:**

```typescript
import { pool } from "../lib/supabase";

interface TaskProps {
  title: string;
  details: string;
  current_status: string;
}

export const TaskService = {
  add: async (task: TaskProps, userId: string) => {
    const { rows } = await pool.query(
      `
            INSERT INTO tasks (user_id, title, details, current_status)
            VALUES($1, $2, $3, $4)
            RETURNING *;
            `,
      [userId, task.title, task.details, task.current_status],
    );
    return rows[0];
  },
};
```

**Status:** ✅ Exists but incomplete  
**Missing:** No `update` method exists  
**Required:** Add an `update` method that accepts task ID and updated fields

**Database Schema (from migration):**

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    details TEXT,
    current_status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

**Fields that can be updated:**

- `title` (NOT NULL)
- `details` (nullable)
- `current_status` (NOT NULL) - This is what changes when moving between columns

---

### 1.3 WebSocket Service (from dev branch)

**File:** `src/services/websocket.service.ts`

**Current Implementation:**

```typescript
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
  TASK_UPDATED: "TASK_UPDATED", // ⚠️ NOT YET UPDATED TO LOWERCASE
  TASK_MOVED: "TASK_MOVED", // ⚠️ NOT YET UPDATED TO LOWERCASE
  TASK_DELETED: "TASK_DELETED", // ⚠️ NOT YET UPDATED TO LOWERCASE
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
```

**Status:** ✅ Exists and working  
**Note:** `TASK_UPDATED` constant exists but uses UPPERCASE (should be `"task:updated"` to match `task:created` pattern)  
**Action Required:** Update `TASK_UPDATED: "TASK_UPDATED"` to `TASK_UPDATED: "task:updated"`

---

### 1.4 Task Routes (from dev branch)

**File:** `src/routes/task.routes.ts`

**Current Implementation:**

```typescript
import { Router } from "express";
import { addTask } from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";

const router = Router();

router.post("/add", authenticated, addTask);

export default router;
```

**Status:** ✅ Exists but incomplete  
**Missing:** No update route  
**Mounted On:** `/task` prefix (from `src/index.ts`)  
**Current Endpoint:** `POST /task/add`  
**Expected Update Endpoint:** `POST /task/update/:id` or `PUT /task/:id` or `PATCH /task/:id`

---

### 1.5 Main Server Setup (from dev branch)

**File:** `src/index.ts`

```typescript
app.use("/task", taskRoutes);
app.use("/auth", authRoutes);
```

**Status:** ✅ Task routes are mounted on `/task` prefix  
**WebSocket:** ✅ Initialized and running with JWT authentication

---

### 1.6 Authentication Middleware (from dev branch)

**File:** `src/middleware/middleware.ts`

```typescript
export interface AuthRequest extends Request {
  user?: any;
}

export const authenticated = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const accessToken = req.cookies.access_token;

  if (!accessToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Access token expired" });
  }
};
```

**Status:** ✅ Working and in use  
**Usage:** All task endpoints should use the `authenticated` middleware

---

## 2. Documentation Review

### 2.1 Broadcast task:created Plan

**File:** `plans/broadcast-task-created/plan.md`

**Key Learnings:**

1. ✅ Event naming convention: lowercase with colon separator (`task:created`, not `TASK_CREATED`)
2. ✅ Broadcast pattern: Call after successful service operation
3. ✅ Payload: Full task object returned from database
4. ✅ Timestamp: ISO 8601 format (`new Date().toISOString()`)
5. ✅ Fire-and-forget: Broadcast doesn't affect REST response
6. ⚠️ **Endpoint naming:** Project uses `/task/add` not `/tasks`

**Implementation Pattern (from task:created):**

```typescript
const result = await TaskService.add(task, userId);

broadcast({
  type: MessageType.TASK_CREATED,
  payload: result,
  timestamp: new Date().toISOString(),
});

res.json(result);
```

---

### 2.2 WebSocket Setup Plan

**File:** `plans/websocket-setup/plan.md`

**Key Points:**

- Future work section mentions: "Broadcast `task:updated` — Same pattern for task updates (requires building the update endpoint first)"
- Confirms update endpoint doesn't exist yet
- Uses `ws` library (not socket.io)
- All clients are JWT-authenticated

---

### 2.3 WebSocket JWT Auth Plan

**File:** `plans/websocket-jwt-auth/plan.md`

**Key Points:**

- JWT token passed via query parameter: `ws://localhost:8000?token=<JWT>`
- Connection rejected with code `4001` if unauthenticated
- User payload attached to WebSocket: `{ userId, email, name }`

---

## 3. Dependencies

### 3.1 WebSocket Service Structure

**Status:** ✅ Complete and working

**Components:**

- ✅ `broadcast(message)` - sends to all connected clients
- ✅ `addClient(ws)` / `removeClient(ws)` - client tracking
- ✅ `MessageType` constants - event type definitions
- ✅ `WebSocketMessage` interface - message schema
- ✅ `AuthenticatedWebSocket` interface - typed WebSocket with user

**Usage Example:**

```typescript
broadcast({
  type: MessageType.TASK_UPDATED,
  payload: { id: "...", title: "...", current_status: "in-progress", ... },
  timestamp: "2026-03-18T20:00:00.000Z",
});
```

---

### 3.2 Authentication Requirements

**Status:** ✅ Complete and working

- ✅ JWT authentication on REST endpoints via `authenticated` middleware
- ✅ JWT authentication on WebSocket connections via query parameter
- ✅ Access token contains: `{ userId, email, name }`
- ✅ User ID available in controller: `req.user?.userId`

---

### 3.3 Task Data Model

**Database Table:** `tasks`

**Fields:**

- `id` - UUID (auto-generated)
- `user_id` - TEXT (foreign key to users)
- `title` - TEXT (NOT NULL)
- `details` - TEXT (nullable)
- `current_status` - TEXT (NOT NULL) - **This is what changes when moving columns**
- `created_at` - TIMESTAMPTZ (auto)
- `deleted_at` - TIMESTAMPTZ (nullable - soft delete)

**Task Object Shape (from task:created payload):**

```typescript
{
  id: "uuid",
  user_id: "string",
  title: "string",
  details: "string | null",
  current_status: "todo | in-progress | done", // or any status value
  created_at: "2026-03-18T...",
  deleted_at: null
}
```

---

## 4. Patterns

### 4.1 How task:created is Implemented

**Step 1:** Service method returns created task

```typescript
const result = await TaskService.add(task, userId);
```

**Step 2:** Broadcast to WebSocket clients

```typescript
broadcast({
  type: MessageType.TASK_CREATED,
  payload: result,
  timestamp: new Date().toISOString(),
});
```

**Step 3:** Return REST response

```typescript
res.json(result);
```

**Error Handling:**

```typescript
try {
  // ... operations
} catch (err: any) {
  res.status(500).json({ error: err.message });
}
```

---

### 4.2 WebSocket Message Structure

**Schema:**

```typescript
{
  type: "task:created" | "TASK_UPDATED" | "TASK_MOVED" | "TASK_DELETED",
  payload: Record<string, unknown>, // Full task object
  timestamp: string // ISO 8601
}
```

**Example (task:created):**

```json
{
  "type": "task:created",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user123",
    "title": "Implement login page",
    "details": "Create React component with form validation",
    "current_status": "todo",
    "created_at": "2026-03-18T20:00:00.000Z",
    "deleted_at": null
  },
  "timestamp": "2026-03-18T20:00:01.234Z"
}
```

**Expected (task:updated):**

```json
{
  "type": "task:updated",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user123",
    "title": "Implement login page",
    "details": "Create React component with form validation",
    "current_status": "in-progress",
    "created_at": "2026-03-18T20:00:00.000Z",
    "deleted_at": null
  },
  "timestamp": "2026-03-18T20:05:00.000Z"
}
```

---

### 4.3 Current Task Operations

**Available Operations:**

- ✅ `TaskService.add(task, userId)` - Create task

**Missing Operations:**

- ❌ `TaskService.update(id, updates, userId)` - Update task
- ❌ `TaskService.delete(id, userId)` - Delete task
- ❌ `TaskService.getById(id, userId)` - Get single task
- ❌ `TaskService.getAllByUser(userId)` - Get all user tasks

---

## 5. Complete Findings

### 5.1 Exact File Paths and Code Snippets

**Files that exist and need modification:**

- ✅ `src/controller/task.controller.ts` - Add `updateTask` function
- ✅ `src/services/task.service.ts` - Add `update` method
- ✅ `src/services/websocket.service.ts` - Update `MessageType.TASK_UPDATED` to lowercase
- ✅ `src/routes/task.routes.ts` - Add update route

**Files that exist and are complete:**

- ✅ `src/index.ts` - Server setup with WebSocket
- ✅ `src/websocket.ts` - WebSocket initialization with JWT auth
- ✅ `src/middleware/middleware.ts` - Authentication middleware
- ✅ `src/lib/supabase.ts` - Database connection
- ✅ `supabase/migrations/20260303010340_init.sql` - Database schema

---

### 5.2 Current Endpoint Paths

**Existing Endpoints:**

- ✅ `POST /task/add` - Create task (authenticated)
- ✅ `GET /auth/...` - Authentication endpoints
- ✅ WebSocket: `ws://localhost:8000?token=<JWT>`

**Missing Endpoints:**

- ❌ Task update endpoint (need to create)
- ❌ Task delete endpoint
- ❌ Task get/list endpoints

**Expected Update Endpoint:**
Based on the pattern, it should be one of:

- `POST /task/update/:id` (follows `/task/add` pattern)
- `PUT /task/:id` (RESTful)
- `PATCH /task/:id` (RESTful, for partial updates)

**Recommendation:** Use `PATCH /task/:id` as it's RESTful and indicates partial update

---

### 5.3 WebSocket Service Broadcast Implementation

**Function:** `broadcast(message: WebSocketMessage)`

**Location:** `src/services/websocket.service.ts`

**Implementation:**

```typescript
export function broadcast(message: WebSocketMessage): void {
  const serialized = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(serialized);
    }
  }
}
```

**Behavior:**

- Serializes message to JSON
- Iterates through all connected clients (`Set<AuthenticatedWebSocket>`)
- Only sends to clients with `readyState === WebSocket.OPEN`
- Fire-and-forget (no error handling, no retry)
- Includes sender (sender receives their own update)

**Testing:** WebSocket test page available at `http://localhost:8000/ws-test.html`

---

### 5.4 Task Update Endpoint - Implementation Needed

**Status:** ❌ **Does NOT exist**

**Required Implementation:**

**1. Add to `src/services/task.service.ts`:**

```typescript
interface UpdateTaskProps {
  title?: string;
  details?: string;
  current_status?: string;
}

update: async (id: string, updates: UpdateTaskProps, userId: string) => {
  const { rows } = await pool.query(
    `
        UPDATE tasks
        SET 
          title = COALESCE($1, title),
          details = COALESCE($2, details),
          current_status = COALESCE($3, current_status)
        WHERE id = $4 AND user_id = $5 AND deleted_at IS NULL
        RETURNING *;
        `,
    [updates.title, updates.details, updates.current_status, id, userId],
  );

  if (rows.length === 0) {
    throw new Error("Task not found or unauthorized");
  }

  return rows[0];
};
```

**2. Add to `src/controller/task.controller.ts`:**

```typescript
export const updateTask = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.update(id, updates, userId);

    // ─── Broadcast to all connected WebSocket clients ────────────
    broadcast({
      type: MessageType.TASK_UPDATED,
      payload: result,
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    if (err.message === "Task not found or unauthorized") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};
```

**3. Add to `src/routes/task.routes.ts`:**

```typescript
import { updateTask } from "../controller/task.controller";

router.patch("/:id", authenticated, updateTask);
```

**4. Update `src/services/websocket.service.ts`:**

```typescript
export const MessageType = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated", // ✅ Changed from "TASK_UPDATED"
  TASK_MOVED: "TASK_MOVED",
  TASK_DELETED: "TASK_DELETED",
} as const;
```

---

### 5.5 Discrepancies Between Acceptance Criteria and Implementation

**Discrepancy #1: Endpoint Path**

- Acceptance Criteria: "Triggered after a successful task update in POST /tasks"
- Actual Implementation: Project uses `/task/add` not `/tasks`
- Expected Update Endpoint: `PATCH /task/:id` (not `POST /tasks`)

**Discrepancy #2: Event Naming**

- Acceptance Criteria: "Event name: task:updated"
- Current Code: `MessageType.TASK_UPDATED: "TASK_UPDATED"` (uppercase)
- Required Change: Update to `"task:updated"` to match `task:created` pattern

**Discrepancy #3: Endpoint Method**

- Acceptance Criteria mentions "POST /tasks"
- RESTful convention: Updates should use `PUT` or `PATCH`, not `POST`
- Recommendation: Use `PATCH /task/:id`

---

## 6. Implementation Checklist

Based on the research, here's what needs to be done:

### Step 1: Update WebSocket Event Name

- [ ] Update `MessageType.TASK_UPDATED` from `"TASK_UPDATED"` to `"task:updated"` in `src/services/websocket.service.ts`

### Step 2: Create Task Update Service Method

- [ ] Add `update` method to `TaskService` in `src/services/task.service.ts`
- [ ] Add `UpdateTaskProps` interface
- [ ] Handle authorization (user can only update their own tasks)
- [ ] Handle not found errors
- [ ] Return updated task object

### Step 3: Create Task Update Controller

- [ ] Add `updateTask` function to `src/controller/task.controller.ts`
- [ ] Extract task ID from `req.params.id`
- [ ] Extract updates from `req.body`
- [ ] Verify user authentication
- [ ] Call `TaskService.update()`
- [ ] Broadcast `task:updated` event
- [ ] Return updated task in response
- [ ] Handle 404 and 500 errors

### Step 4: Add Update Route

- [ ] Import `updateTask` in `src/routes/task.routes.ts`
- [ ] Add route: `router.patch("/:id", authenticated, updateTask)`

### Step 5: Testing

- [ ] Test `PATCH /task/:id` returns updated task
- [ ] Test WebSocket clients receive `task:updated` event
- [ ] Test authorization (user can't update others' tasks)
- [ ] Test 404 for non-existent tasks
- [ ] Test validation for required fields
- [ ] Test moving tasks between columns (`current_status` update)

---

## 7. Testing Plan

### Manual Testing Steps

**1. Start Server:**

```bash
npm run dev
```

**2. Open WebSocket Test Page:**

- Navigate to `http://localhost:8000/ws-test.html`
- Open in 2+ browser tabs
- Connect with valid JWT token in each tab

**3. Create a Task:**

```bash
POST http://localhost:8000/task/add
Cookie: access_token=<JWT>
Content-Type: application/json

{
  "title": "Test Task",
  "details": "Testing update broadcast",
  "current_status": "todo"
}
```

**4. Update the Task:**

```bash
PATCH http://localhost:8000/task/<task-id>
Cookie: access_token=<JWT>
Content-Type: application/json

{
  "current_status": "in-progress"
}
```

**5. Verify:**

- ✅ REST endpoint returns updated task with 200 status
- ✅ All WebSocket clients receive message with:
  - `type: "task:updated"`
  - `payload: { ... updated task ... }`
  - `timestamp: "2026-03-18T..."`
- ✅ `current_status` is changed in payload
- ✅ Sender also receives broadcast

**6. Test Authorization:**

```bash
# Try to update another user's task
PATCH http://localhost:8000/task/<other-users-task-id>
# Expected: 404 Not Found
```

**7. Test Non-existent Task:**

```bash
PATCH http://localhost:8000/task/99999999-9999-9999-9999-999999999999
# Expected: 404 Not Found
```

---

## 8. Additional Notes

### Security Considerations

- ✅ User can only update their own tasks (WHERE user_id = $5 in query)
- ✅ Soft delete check (AND deleted_at IS NULL)
- ✅ JWT authentication required
- ✅ No SQL injection (parameterized queries)

### Performance Considerations

- ✅ Broadcast is fire-and-forget (non-blocking)
- ✅ Only sends to open connections
- ⚠️ No rate limiting on updates (could spam broadcasts)

### Future Enhancements

- Add validation for `current_status` values
- Add `updated_at` timestamp to tasks table
- Add rate limiting for task updates
- Add optimistic updates on frontend
- Add conflict resolution for concurrent updates

---

## 9. Summary

**What Exists:**

- ✅ Complete WebSocket infrastructure with JWT auth
- ✅ `task:created` broadcast fully implemented
- ✅ Database schema with tasks table
- ✅ Task creation endpoint (`POST /task/add`)
- ✅ `broadcast()` function ready to use
- ✅ `MessageType.TASK_UPDATED` constant (needs lowercase update)

**What's Missing:**

- ❌ Task update service method
- ❌ Task update controller function
- ❌ Task update route
- ❌ `task:updated` event in lowercase

**Confidence Level:** 80%

- High confidence in WebSocket implementation (working code exists)
- High confidence in pattern to follow (task:created is reference)
- Medium confidence in endpoint design (need to confirm REST conventions)
- Low risk - similar to task:created implementation

**Next Steps:**

1. Update `MessageType.TASK_UPDATED` to lowercase
2. Implement `TaskService.update()` method
3. Implement `updateTask` controller
4. Add PATCH route
5. Test thoroughly

---

**End of Research Document**
