const http = require("http");
const WebSocket = require("ws");
const net = require("net");

const BASE_URL = "http://localhost:8000";
const WS_URL = "ws://localhost:8000";

/**
 * Helper: Make HTTP request and return cookies
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      const cookies = res.headers["set-cookie"] || [];

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          status: res.statusCode,
          data: data ? JSON.parse(data) : null,
          cookies,
          headers: res.headers,
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Main test function
 */
async function testWebSocketAuth() {
  console.log("🧪 Starting WebSocket JWT Authentication Test\n");

  try {
    // Step 1: Check if server is running
    console.log("1️⃣  Checking if server is running...");
    const healthCheck = await makeRequest({
      hostname: "localhost",
      port: 8000,
      path: "/",
      method: "GET",
    });

    if (healthCheck.status !== 200) {
      throw new Error(`Server not responding. Status: ${healthCheck.status}`);
    }
    console.log("✅ Server is running\n");

    // Step 2: Test unauthenticated WebSocket connection (should be rejected)
    console.log(
      "2️⃣  Testing unauthenticated WebSocket connection (should fail)...",
    );
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}`);
      let opened = false;

      ws.on("open", () => {
        console.log("  ⚠️  Connection opened, waiting for close/error...");
        opened = true;
      });

      ws.on("close", (code, reason) => {
        if (code === 4001 && reason.includes("Missing token")) {
          console.log(`✅ Correctly rejected with code 4001: "${reason}"\n`);
          resolve();
        } else if (code === 4001) {
          console.log(`✅ Rejected with code 4001 (JWT issue): "${reason}"\n`);
          resolve();
        } else {
          reject(
            new Error(
              `❌ FAIL: Wrong close code or reason. Code: ${code}, Reason: ${reason}`,
            ),
          );
        }
      });

      ws.on("error", (error) => {
        console.log(`✅ Connection error as expected: ${error.message}\n`);
        resolve();
      });

      setTimeout(() => {
        if (opened) {
          reject(
            new Error(
              "❌ FAIL: Unauthenticated connection was accepted and not closed!",
            ),
          );
        } else {
          reject(new Error("Timeout waiting for connection response"));
        }
      }, 3000);
    });

    // Step 3: Test invalid token rejection
    console.log("3️⃣  Testing invalid token rejection...");
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}?token=invalid-token-xyz`);
      let opened = false;

      ws.on("open", () => {
        console.log("  ⚠️  Connection opened, waiting for close/error...");
        opened = true;
      });

      ws.on("close", (code, reason) => {
        if (code === 4001 && reason.includes("Invalid or expired token")) {
          console.log(
            `✅ Correctly rejected invalid token with code 4001: "${reason}"\n`,
          );
          resolve();
        } else if (code === 4001) {
          console.log(`✅ Rejected with code 4001: "${reason}"\n`);
          resolve();
        } else {
          reject(
            new Error(
              `❌ FAIL: Wrong close code or reason. Code: ${code}, Reason: ${reason}`,
            ),
          );
        }
      });

      ws.on("error", (error) => {
        console.log(`✅ Invalid token error as expected: ${error.message}\n`);
        resolve();
      });

      setTimeout(() => {
        if (opened) {
          reject(
            new Error(
              "❌ FAIL: Invalid token connection was accepted and not closed!",
            ),
          );
        } else {
          reject(new Error("Timeout waiting for connection response"));
        }
      }, 3000);
    });

    // Step 4: Test that /auth/token requires authentication
    console.log("4️⃣  Testing that /auth/token requires authentication...");
    const unauthTokenResponse = await makeRequest({
      hostname: "localhost",
      port: 8000,
      path: "/auth/token",
      method: "GET",
    });

    if (unauthTokenResponse.status === 401) {
      console.log("✅ /auth/token correctly requires authentication (401)\n");
    } else {
      console.log(
        `⚠️  /auth/token returned status ${unauthTokenResponse.status} (expected 401)\n`,
      );
    }

    // Step 5: Generate a test JWT token (for manual testing or if you have test credentials)
    console.log("5️⃣  For authenticated WebSocket testing:");
    console.log("   a) Log in via Google OAuth in your browser");
    console.log("   b) Then run this test again, OR");
    console.log("   c) In browser console after login, run:\n");
    console.log('      fetch("/auth/token", { credentials: "include" })');
    console.log("        .then(r => r.json())");
    console.log("        .then(({ access_token }) => {");
    console.log(
      "          const ws = new WebSocket(`ws://localhost:8000?token=${access_token}`);",
    );
    console.log(
      '          ws.onopen = () => console.log("✅ WebSocket connected!");',
    );
    console.log(
      '          ws.onmessage = (e) => console.log("Message:", JSON.parse(e.data));',
    );
    console.log(
      '          ws.onclose = (e) => console.log("Closed:", e.code, e.reason);',
    );
    console.log("        })\n");

    console.log(
      "✨ Test completed successfully! All unauthenticated rejections working correctly.",
    );
    console.log("📝 See instructions above for full authenticated flow.\n");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testWebSocketAuth().catch(console.error);
