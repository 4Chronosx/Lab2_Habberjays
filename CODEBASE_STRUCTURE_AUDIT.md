# Codebase Structure Audit

Date: 2026-03-18
Scope: Source and project files only (excluding node_modules, dist, and .git internals)

## 1. Top-level layout

- app.js: Frontend runtime logic (auth/session checks, fetch wrapper, page init)
- home.html: Authenticated home page shell
- index.html: Login page shell
- src/: Backend TypeScript source
- public/: Static assets served by backend (includes WebSocket test page)
- supabase/: Local Supabase config and SQL migrations
- test.http, task-broadcast.rest: Manual REST Client request collections
- test-websocket-auth.js: Manual Node WebSocket auth test script
- package.json: Scripts and dependencies
- README.md: Current setup and manual route testing docs

## 2. Backend architecture map

### 2.1 Entry point

- src/index.ts
  - Creates Express app
  - Applies cookie parser and CORS
  - Registers JSON parser and static public folder
  - Mounts task routes at /task
  - Mounts auth routes at /auth
  - Creates HTTP server and initializes WebSocket layer

### 2.2 Routing layer

- src/routes/auth.routes.ts
  - OAuth and auth-related HTTP endpoints
- src/routes/task.routes.ts
  - Currently only POST /task/add (authenticated)
  - Missing list/update/delete endpoints for full task lifecycle

### 2.3 Controller layer

- src/controller/auth.controller.ts
  - OAuth callback, verification, refresh/logout behavior
- src/controller/task.controller.ts
  - addTask handler only
  - Calls TaskService.add and broadcasts TASK_CREATED over WebSocket

### 2.4 Service layer

- src/services/task.service.ts
  - add method only (INSERT task)
- src/services/websocket.service.ts
  - Connection tracking and broadcast utilities
  - MessageType enum includes created/updated/moved/deleted
- src/services/auth.service.ts
- src/services/token.service.ts
- src/services/refresh_token.service.ts
- src/services/user.service.ts

### 2.5 Middleware layer

- src/middleware/middleware.ts
  - Authenticated request gate and AuthRequest typing

### 2.6 Integration libraries

- src/lib/supabase.ts: DB pool configuration
- src/lib/google.ts: Google OAuth integration helper

## 3. Data layer map

### 3.1 Existing migrations

- supabase/migrations/20260303010340_init.sql
  - Creates base users and tasks tables
- supabase/migrations/20260314152503_refresh_token_table_create.sql
  - Adds refresh token persistence table

### 3.2 Task domain state (current)

- Task add persists: user_id, title, details, current_status
- Soft deletion is represented in schema with deleted_at
- Updated timestamp support for conflict resolution is not yet confirmed in code paths and must be validated/added

## 4. Frontend architecture map

### 4.1 Runtime script

- app.js
  - API_URL constant
  - fetchWithAuth wrapper with 401 refresh retry
  - CSRF fetch helper
  - Login/home page initialization logic
  - No task board state layer yet
  - No offline cache/queue yet

### 4.2 UI pages

- index.html
  - OAuth login entry
- home.html
  - Session user info + logout button
  - No task board controls currently present

### 4.3 Manual WebSocket client

- public/ws-test.html
  - Test-only socket client for observing messages

## 5. Test and quality baseline

### 5.1 Current testing

- Manual only
  - REST files: test.http and task-broadcast.rest
  - Script: test-websocket-auth.js
- No automated unit/integration test framework configured yet

### 5.2 Existing quality controls

- TypeScript strict mode enabled
- Husky hooks enabled
- Commitlint configured

## 6. Offline/sync implementation impact map

This map identifies where changes should go with minimal disruption to existing code.

### 6.1 Existing files to extend

- app.js
  - Keep auth/session flow intact
  - Add wiring to offline repository and sync engine
- src/services/task.service.ts
  - Add list/update/delete methods for sync replay targets
- src/controller/task.controller.ts
  - Add list/update/delete handlers
- src/routes/task.routes.ts
  - Add GET/PUT/DELETE routes
- README.md
  - Document conflict strategy and behavior
- package.json
  - Add isolated test scripts only

### 6.2 New files/folders recommended

- docs/
  - docs/manual-console-verification.md (step-by-step console-only checks)
  - docs/offline-sync-implementation-plan.md (master implementation blueprint)
- src/frontend/offline/
  - storage.repository.js or storage.repository.ts
  - sync.queue.js or sync.queue.ts
  - conflict.resolver.js or conflict.resolver.ts
  - offline.types.md (if staying JS-only, document shape contracts)

Note: Because current frontend is plain JS loaded directly in HTML, introducing TypeScript on frontend would require additional build setup. To minimize disruption, start with plain JS modules and strict documented contracts.

## 7. Technical constraints and decisions already inferred

- localStorage is required to align with your Part 2 context.
- localStorage cannot be shared directly across different origins/repositories in browser security model.
- If both projects do not run under the exact same origin, add optional import/export JSON bridge.
- Queue replay must target existing CRUD endpoints to minimize backend changes.

## 8. Gaps that must be closed before implementation

- Confirm/introduce task updated timestamp for deterministic conflict resolution.
- Add backend CRUD endpoints to support replay and reconciliation.
- Introduce offline state model with explicit synced flag and changedAt timestamps.
- Add deterministic conflict resolver and deleted-on-server edge case handling.

## 9. Definition of done mapping (for later execution)

- Server-fetched tasks cached locally on fetch.
- Offline CRUD writes to local cache/queue with synced: false.
- Online event replays unsynced records in chronological order.
- Successful replays mark records synced: true.
- Failures are surfaced and retained without data loss.
- Conflict strategy is consistently applied and documented.
