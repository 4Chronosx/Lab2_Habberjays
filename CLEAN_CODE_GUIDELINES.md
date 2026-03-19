# Clean Code Guidelines

Date: 2026-03-18
Purpose: Coding rules for the offline cache, queue sync, conflict-resolution feature set

## 1. Core principles

1. Keep behavior deterministic.
   - Queue ordering and conflict outcomes must be predictable and testable.
2. Prefer small, focused modules.
   - Separate storage, queue replay, and conflict resolution responsibilities.
3. Minimize edits to existing code.
   - Extend existing files only at integration points.
4. Preserve backward compatibility.
   - Do not break current auth/session and existing endpoints.

## 2. File and module conventions

1. One reason to change per module.
   - storage repository module: read/write local task and queue state.
   - sync engine module: replay logic and retry behavior.
   - conflict resolver module: one pure decision function.
2. Keep integration file thin.
   - app.js should orchestrate and delegate, not contain core queue algorithms.
3. Name modules by role.
   - taskStorage, taskSyncEngine, taskConflictResolver.

## 3. Function design rules

1. Keep functions short and explicit.
   - Target 15-40 lines unless unavoidable.
2. Use intent-revealing names.
   - Good: enqueueOfflineUpdate, markQueueItemSynced.
   - Avoid: doSync, handleStuff.
3. Use explicit inputs/outputs.
   - Avoid hidden mutable global state where possible.
4. Prefer pure functions for decision logic.
   - Conflict resolver should be side-effect free.

## 4. Data contract rules

Every offline queue item must include:

- id: unique local queue record id
- taskId: task identifier
- operation: CREATE | UPDATE | DELETE
- payload: operation-specific body
- changedAt: ISO timestamp from client at mutation time
- synced: boolean (false until confirmed by server)
- retryCount: integer
- lastError: nullable error description

Every locally persisted task should include:

- id
- title
- details
- current_status
- updated_at (or equivalent canonical update marker)
- synced: boolean
- locallyDeleted: boolean (if applying local soft-delete representation)

Rules:

1. Never omit synced on records participating in sync logic.
2. Never mutate queue order after insertion.
3. Never delete failed queue items automatically.

## 5. Error handling standards

1. Fail safely with data preservation.
   - On replay failure, keep queue item and task state intact.
2. Capture actionable error details.
   - Record status code, endpoint, and message in lastError.
3. Surface errors without blocking all progress.
   - Continue replay for recoverable failures where policy allows.
4. Guard unsafe assumptions.
   - Validate JSON parse/stringify boundaries and null states.

## 6. Conflict-resolution standards

Chosen strategy baseline: timestamp comparison with latest-edit preference.

1. Compare local changedAt vs server updated_at.
2. Newer timestamp wins.
3. Deterministic tie-breaker must be fixed and documented.
   - Recommended tie-breaker: server wins on exact timestamp tie.
4. Deleted-on-server and updated-locally edge case.
   - Do not discard local data silently.
   - Keep local conflict copy and require explicit resolution action.

## 7. API interaction standards

1. Reuse existing CRUD endpoints.
2. Keep endpoint adapters centralized.
3. Validate response codes explicitly.
4. Do not assume success body shape without checks.

## 8. Logging standards

1. Use concise, structured logs for sync lifecycle.
   - Sync start, item attempt, success/failure, summary.
2. Never log sensitive tokens/cookies.
3. Keep user-facing messaging separate from debug logs.

## 9. Testing standards

1. Unit tests for pure logic first.
   - conflict resolver, queue ordering, state transitions.
2. Integration tests for replay orchestration.
3. Add edge-case tests before refactors.
4. Every acceptance criterion must map to at least one test.

## 10. Documentation standards

1. README must document chosen conflict strategy and rationale.
2. Manual runbook must be executable step-by-step from terminal/console.
3. Keep docs in sync with actual key names and endpoint paths.

## 11. Minimize disruption checklist

Before each edit, verify:

1. Is this change necessary for acceptance criteria?
2. Can this be added in a new file instead of modifying an existing one?
3. Is any existing behavior unrelated to offline sync affected?
4. Is there a smaller integration surface available?

If any answer suggests avoidable risk, split change into a new module and adapt through thin wrappers.
