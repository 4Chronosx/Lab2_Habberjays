#!/usr/bin/env node

/**
 * Automated test script for the task:updated broadcast.
 *
 * Run with: node test-broadcast-task-updated.js
 *
 * Requirements:
 * - Server must be running at http://localhost:8000
 * - JWT_SECRET must be set in the environment (same as server)
 */

const assert = require("assert");
const jwt = require("jsonwebtoken");
const { WebSocket } = require("ws");
require("dotenv").config();

const BASE_URL = "http://localhost:8000";
const WS_URL = "ws://localhost:8000";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (err) {
    throw new Error(`Failed to parse JSON from ${url}: ${text}`);
  }
  return { status: res.status, body };
}

async function main() {
  console.log("🧪 Running task:updated broadcast test script...");

  const secret = process.env.JWT_SECRET;
  assert(secret, "JWT_SECRET is not set in the environment");

  console.log("1) Checking server health...");
  const health = await fetchJson(`${BASE_URL}/`);
  assert.strictEqual(health.status, 200, "Server did not respond with 200");
  console.log("✅ Server is running");

  console.log("\n2) Generating test JWT token...");
  // Use a real user ID from your database. If you don't have one, log in via the app first
  // and get your user ID from the browser console or database.
  // For development: use process.env.TEST_USER_ID or prompt for one.
  const testUserId = process.env.TEST_USER_ID || "111053575751293328505";
  console.log(`   Using user ID: ${testUserId}`);
  console.log(
    "   ℹ️  If this test fails with foreign key violation, update TEST_USER_ID",
  );

  const token = jwt.sign(
    { userId: testUserId, email: "test@example.com", name: "Test User" },
    secret,
    { expiresIn: "15m" },
  );
  console.log("✅ Token generated (shortened):", `${token.slice(0, 30)}...`);

  const cookieHeader = `access_token=${token}`;

  console.log("\n3) Confirm unauthenticated request returns 401...");
  const unauthRes = await fetchJson(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "x", description: "x", current_status: "todo" }),
  });
  assert.strictEqual(
    unauthRes.status,
    401,
    "Expected 401 for unauthenticated request",
  );
  console.log("✅ Unauthenticated request returned 401");

  console.log("\n4) Create a task (authenticated)...");
  console.log("   Sending task creation request with access_token cookie...");
  const createRes = await fetchJson(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      title: "Automated test task",
      description: "Task created by automated test",
      current_status: "todo",
    }),
  });

  console.log(`   Response status: ${createRes.status}`);
  console.log(`   Response body:`, JSON.stringify(createRes.body, null, 2));

  if (createRes.status !== 200) {
    console.error("\n❌ Task creation failed!");
    console.error("   Status:", createRes.status);
    console.error("   Body:", JSON.stringify(createRes.body, null, 2));
    console.error("\n⚠️  Check server logs for the actual error message:");
    console.error(
      "   The server should show a detailed error if the database query failed.\n",
    );
  }
  assert.strictEqual(
    createRes.status,
    200,
    `Task creation should return 200, got ${createRes.status}`,
  );
  const task = createRes.body;
  assert.ok(task.id, "Task response should include id");
  console.log("✅ Task created with id:", task.id);

  console.log("\n5) Connect WebSocket and wait for welcome message...");
  const ws = new WebSocket(`${WS_URL}?token=${token}`);

  const received = [];
  ws.on("message", (data) => {
    try {
      received.push(JSON.parse(data.toString()));
    } catch (err) {
      // ignore
    }
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("WebSocket welcome not received")),
      5000,
    );
    ws.on("open", () => {
      /* noop */
    });
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "welcome") {
        clearTimeout(timeout);
        resolve();
      }
    });
    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log("✅ WebSocket connected and welcome received");

  console.log("\n6) Update task and verify broadcast is received...");

  const broadcastPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Did not receive task:updated broadcast")),
      5000,
    );

    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (msg.type === "task:updated") {
        clearTimeout(timer);
        resolve(msg);
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  const updateRes = await fetchJson(`${BASE_URL}/tasks/${task.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      title: "Updated by test",
      current_status: "in-progress",
    }),
  });

  assert.strictEqual(updateRes.status, 200, "Update should return 200");
  console.log("✅ Task updated via REST API");

  const broadcastMsg = await broadcastPromise;
  assert.strictEqual(broadcastMsg.type, "task:updated");
  assert.strictEqual(broadcastMsg.payload.id, task.id);
  assert.strictEqual(broadcastMsg.actor.email, "test@example.com");
  assert.ok(typeof broadcastMsg.timestamp === "string");
  console.log("✅ Broadcast received (task:updated)");

  console.log("\n7) Confirm 404 is returned for non-existent task id...");
  const missingId = "00000000-0000-0000-0000-000000000000";
  const missingRes = await fetchJson(`${BASE_URL}/tasks/${missingId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ title: "nope" }),
  });
  assert.strictEqual(
    missingRes.status,
    404,
    "Expected 404 for non-existent task",
  );
  console.log("✅ Non-existent task returns 404");

  console.log("\n8) Confirm 401 when access_token cookie is missing...");
  const missingAuthRes = await fetchJson(`${BASE_URL}/tasks/${task.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "should fail" }),
  });
  assert.strictEqual(
    missingAuthRes.status,
    401,
    "Expected 401 without auth cookie",
  );
  console.log("✅ Unauthorized request returns 401");

  console.log(
    "\n9) Verify update still works when no WebSocket clients are connected...",
  );
  ws.close();
  await delay(200);

  const updateNoWsRes = await fetchJson(`${BASE_URL}/tasks/${task.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ title: "Updated after WS closed" }),
  });
  assert.strictEqual(
    updateNoWsRes.status,
    200,
    "Update should succeed even if no WS clients are connected",
  );
  console.log("✅ Update succeeded with no WS clients connected");

  console.log("\n🎉 All tests passed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
