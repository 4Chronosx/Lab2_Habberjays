#!/usr/bin/env node

const assert = require("assert");
const jwt = require("jsonwebtoken");
const { WebSocket } = require("ws");
require("dotenv").config();

const WS_URL = "ws://localhost:8000";

async function main() {
  console.log("🧪 Running debug:ping -> debug:pong test...");

  const secret = process.env.JWT_SECRET;
  assert(secret, "JWT_SECRET is not set in the environment");

  const testUserId = process.env.TEST_USER_ID || "111053575751293328505";
  const token = jwt.sign(
    { userId: testUserId, email: "test@example.com", name: "Test User" },
    secret,
    { expiresIn: "15m" },
  );

  const ws = new WebSocket(`${WS_URL}?token=${token}`);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("WebSocket welcome message not received"));
    }, 5000);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "welcome") {
          clearTimeout(timeout);
          resolve();
        }
      } catch {
        // ignore parse errors in test bootstrap
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const pongMessage = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Did not receive debug:pong message"));
    }, 5000);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "debug:pong") {
          clearTimeout(timeout);
          resolve(msg);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.send(
      JSON.stringify({
        type: "debug:ping",
        payload: {},
        timestamp: new Date().toISOString(),
      }),
    );
  });

  assert.strictEqual(pongMessage.type, "debug:pong");
  assert.ok(pongMessage.payload && typeof pongMessage.payload === "object");
  assert.ok(typeof pongMessage.timestamp === "string");

  ws.close();
  console.log("✅ debug:ping -> debug:pong passed");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
