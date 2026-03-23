// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// test-broadcast-task-deleted.js
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tests that soft-deleting a task broadcasts a "task:deleted" event with
// minimal payload { id: taskId } to all connected WebSocket clients.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const assert = require("assert");
const jwt = require("jsonwebtoken");
const WebSocket = require("ws").WebSocket;
require("dotenv/config");

const API_BASE = "http://localhost:8000";
const WS_URL = "ws://localhost:8000";

// ─── Utility: Fetch with JSON parsing ────────────────────────────────────────
async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (err) {
    console.error(`Failed to parse JSON from ${url}:`, text);
    throw new Error(`Invalid JSON response: ${text}`);
  }
  return { status: res.status, body };
}

// ─── Test Setup ───────────────────────────────────────────────────────────────
async function runTest() {
  console.log("\n🧪 Starting task:deleted broadcast test...\n");

  // Generate JWT token
  const secret = process.env.JWT_SECRET;
  assert(secret, "❌ JWT_SECRET is not set in the environment");

  const testUserId = process.env.TEST_USER_ID || "111053575751293328505";
  const token = jwt.sign(
    { userId: testUserId, email: "test@example.com", name: "Test User" },
    secret,
    { expiresIn: "15m" },
  );

  const cookieHeader = `access_token=${token}`;

  // ─── Step 1: Health Check ─────────────────────────────────────────────────────
  console.log("1️⃣  Checking server health...");
  try {
    let healthRes = await fetch(`${API_BASE}/health`);
    if (!healthRes.ok) {
      healthRes = await fetch(`${API_BASE}/`);
    }
    assert.ok(httpStatusOk(healthRes.status), "Server health check failed");
    console.log("   ✅ Server is running\n");
  } catch (err) {
    console.error(
      "❌ Server is not reachable. Start the server with `npm run dev`",
    );
    process.exit(1);
  }

  function httpStatusOk(status) {
    return status >= 200 && status < 300;
  }

  // ─── Step 2: Create a Test Task ──────────────────────────────────────────────
  console.log("2️⃣  Creating a test task...");
  const createRes = await fetchJson(`${API_BASE}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      title: "Test Task for Deletion Broadcast",
      description: "This task will be deleted to test the broadcast",
      current_status: "todo",
    }),
  });

  assert.strictEqual(
    createRes.status,
    200,
    `Task creation failed: ${JSON.stringify(createRes.body)}`,
  );
  assert.ok(createRes.body?.id, "Task ID not returned after creation");

  const taskId = createRes.body.id;
  console.log(`   ✅ Task created with ID: ${taskId}\n`);

  // ─── Step 3: Connect WebSocket ────────────────────────────────────────────────
  console.log("3️⃣  Connecting to WebSocket...");
  const ws = new WebSocket(`${WS_URL}?token=${token}`);

  // Track all messages received
  const received = [];
  ws.on("message", (data) => {
    try {
      received.push(JSON.parse(data.toString()));
    } catch (err) {
      console.error("Failed to parse WebSocket message:", data.toString());
    }
  });

  // Wait for welcome message
  let welcomeReceived = false;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error("WebSocket welcome message not received within 5 seconds"),
      );
    }, 5000);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "welcome") {
          welcomeReceived = true;
          clearTimeout(timeout);
          resolve();
        }
      } catch {
        // Ignore parse errors
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  assert.ok(welcomeReceived, "WebSocket did not receive welcome message");
  console.log("   ✅ WebSocket connected and authenticated\n");

  // ─── Step 4: Delete Task & Wait for Broadcast ────────────────────────────────
  console.log("4️⃣  Deleting task and waiting for broadcast...");

  // Set up promise to capture the broadcast message
  const broadcastPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Did not receive task:deleted broadcast within 5 seconds. Received: ${JSON.stringify(received)}`,
        ),
      );
    }, 5000);

    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type === "task:deleted") {
        clearTimeout(timer);
        resolve(msg);
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  // Trigger deletion via REST API
  const deleteRes = await fetchJson(`${API_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
  });

  assert.strictEqual(
    deleteRes.status,
    200,
    `Task deletion failed: ${JSON.stringify(deleteRes.body)}`,
  );
  assert.ok(
    deleteRes.body?.deleted_at,
    "Task was not soft-deleted (deleted_at is null)",
  );
  console.log(`   ✅ Task deleted via REST API (returned full task object)\n`);

  // Wait for the broadcast
  const broadcastMsg = await broadcastPromise;
  console.log("   ✅ Received task:deleted broadcast via WebSocket\n");

  // ─── Step 5: Validate Broadcast Message ──────────────────────────────────────
  console.log("5️⃣  Validating broadcast message structure...");

  assert.strictEqual(
    broadcastMsg.type,
    "task:deleted",
    `Expected type "task:deleted", got "${broadcastMsg.type}"`,
  );
  console.log('   ✅ Message type is "task:deleted"');

  assert.ok(
    broadcastMsg.payload && typeof broadcastMsg.payload === "object",
    "Payload is not an object",
  );
  console.log("   ✅ Payload is an object");

  assert.strictEqual(
    broadcastMsg.payload.id,
    taskId,
    `Expected payload.id to be ${taskId}, got ${broadcastMsg.payload.id}`,
  );
  console.log(`   ✅ Payload contains correct task ID: ${taskId}`);

  assert.ok(
    broadcastMsg.timestamp && typeof broadcastMsg.timestamp === "string",
    "Timestamp is missing or not a string",
  );
  console.log(`   ✅ Timestamp is present: ${broadcastMsg.timestamp}`);

  assert.strictEqual(
    broadcastMsg.actor?.email,
    "test@example.com",
    "Expected actor.email to be test@example.com",
  );
  console.log(`   ✅ Actor is present: ${broadcastMsg.actor.email}`);

  // Verify payload is minimal (only id, no other task fields)
  const payloadKeys = Object.keys(broadcastMsg.payload);
  assert.strictEqual(
    payloadKeys.length,
    1,
    `Expected payload to have only "id", got keys: ${payloadKeys.join(", ")}`,
  );
  console.log("   ✅ Payload is minimal (id only)\n");

  // ─── Cleanup ──────────────────────────────────────────────────────────────────
  console.log("6️⃣  Cleaning up...");
  ws.close();
  console.log("   ✅ WebSocket closed\n");

  // ─── Test Summary ─────────────────────────────────────────────────────────────
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  console.log("✅ ALL TESTS PASSED");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
  );
  console.log("Summary:");
  console.log(`  • Task created: ${taskId}`);
  console.log(`  • Task deleted via REST API`);
  console.log(`  • REST response returned full deleted task object`);
  console.log(
    `  • WebSocket broadcast sent minimal payload: { id: "${taskId}" }`,
  );
  console.log(`  • All connected clients notified in real-time\n`);

  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
