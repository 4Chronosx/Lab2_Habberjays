async function initiateGoogleOAuth() {
    try {
        const res = await fetch("http://localhost:8000/auth/google/url");
        const { url, state } = await res.json();

        sessionStorage.setItem("oauth_state", state);
        window.location.href = url;
    } catch (err) {
        console.error("Failed to initiate OAuth flow:", err);
        const errorEl = document.getElementById("login-error");
        if (errorEl) {
            errorEl.textContent = "Failed to initiate OAuth flow: " + err;
        }
    }
}

function initLoginPage() {
    const loginButton = document.getElementById("google-signin-button");
    if (loginButton) {
        loginButton.addEventListener("click", initiateGoogleOAuth);
    }
}

async function initHomePage() {
    // verify session with backend
    try {
        const res = await fetch("http://localhost:8000/auth/google/verify", {
            credentials: "include" // sends cookie automatically
        });

        if (!res.ok) {
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

    const logoutButton = document.getElementById("logout");
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            await fetch("http://localhost:8000/auth/google/logout", {
                method: "POST",
                credentials: "include"
            });
            window.location.href = "index.html";
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("google-signin-button")) {
        initLoginPage();
    }
    if (document.getElementById("logout")) {
        initHomePage();
    }
});