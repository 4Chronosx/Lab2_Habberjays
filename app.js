const API_URL = process.env.FRONTEND_URL;

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function fetchWithAuth(url, options = {}) {
    console.log("fetching:", url);
    let res = await fetch(url, { ...options, credentials: "include" });
    console.log("response:", res.status, url);

    if (res.status === 401) {
        console.log("401 received, attempting refresh...");
        const refreshRes = await fetch(`${API_URL}/auth/google/refresh`, {
            method: "POST",
            credentials: "include"
        });
        console.log("refresh response:", refreshRes.status);

        if (!refreshRes.ok) {
            window.location.href = "index.html";
            return null;
        }

        res = await fetch(url, { ...options, credentials: "include" });
        console.log("retry response:", res.status, url);
    }

    return res;
}
// ─── CSRF ─────────────────────────────────────────────────────────────────────

let csrfToken = null;

async function fetchCsrfToken() {
    try {
        const res = await fetch(`${API_URL}/auth/csrf`, {
            credentials: "include"
        });
        const data = await res.json();
        csrfToken = data.csrfToken;
    } catch (err) {
        console.error("Failed to fetch CSRF token:", err);
    }
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

async function initiateGoogleOAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/google/url`, {
            credentials: "include"
        });
        const { url } = await res.json();
        window.location.href = url;
    } catch (err) {
        console.error("Failed to initiate OAuth flow:", err);
        const errorEl = document.getElementById("login-error");
        if (errorEl) {
            errorEl.textContent = "Failed to initiate OAuth flow: " + err;
        }
    }
}

// ─── Login page ───────────────────────────────────────────────────────────────

async function initLoginPage() {
    // if already logged in, redirect to home
    try {
        const res = await fetch(`${API_URL}/auth/google/verify`, {
            credentials: "include"
        });
        if (res.ok) {
            window.location.href = "home.html";
            return;
        }
    } catch (err) {
        // not logged in, stay on login page
    }

    const loginButton = document.getElementById("google-signin-button");
    if (loginButton) {
        loginButton.addEventListener("click", initiateGoogleOAuth);
    }

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
        const errorEl = document.getElementById("login-error");
        if (errorEl) {
            errorEl.textContent = `Authentication error: ${error.replace(/_/g, " ")}`;
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ─── Home page ────────────────────────────────────────────────────────────────

async function initHomePage() {
    await fetchCsrfToken();

    // verify session
    try {
        const res = await fetchWithAuth(`${API_URL}/auth/google/verify`);

        if (!res || !res.ok) {
            window.location.href = "index.html";
            return;
        }

        const { user } = await res.json();

        const userInfoEl = document.getElementById("user-info");
        if (userInfoEl) {
            userInfoEl.textContent = `Welcome, ${user.name}`;
        }
    } catch (err) {
        console.error("Failed to verify session:", err);
        window.location.href = "index.html";
        return;
    }

    // logout
    const logoutButton = document.getElementById("logout");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            await fetchWithAuth(`${API_URL}/auth/google/logout`, {
                method: "POST",
                headers: { "x-csrf-token": csrfToken }
            });
            window.location.href = "index.html";
        });
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("google-signin-button")) {
        initLoginPage();
    }
    if (document.getElementById("logout")) {
        initHomePage();
    }
});