# Kanban App

## Prerequisites

### 1. Environment Variables

Create a `.env` file in the backend root:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:5500
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

### 2. VS Code Live Server — Change Host to Localhost

By default Live Server uses `127.0.0.1` which causes cookie issues.
You must change it to `localhost`:

1. Open VS Code
2. Press `Ctrl + Shift + P` → type **Open User Settings (JSON)**
3. Add the following:

```json
{
  "liveServer.settings.host": "localhost"
}
```

4. Save the file and restart Live Server

---

## Running the App

### Backend

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Server will start on http://localhost:8000
```

### Frontend

1. Open the project folder in VS Code
2. Right click `index.html` → **Open with Live Server**
3. Frontend will be available at `http://localhost:5500/index.html`

---

## Testing Protected Routes (REST Client)

### Setup

Install the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) in VS Code.

### How to get your access token

1. Log in through the browser at `http://localhost:5500/index.html`
2. Open **Chrome DevTools → F12 → Application → Cookies → http://localhost:8000**
3. Find `access_token` and copy its value
4. Paste it in the `Cookie` header of your requests

> ⚠️ The access token expires in **15 minutes**. If you get a `401`, log in again and copy the new token.

> ⚠️ Do **NOT** use the Google `id_token`. Only the `access_token` issued by this server works.

### Task API (Shared Board)

All authenticated users access a team-wide shared board.

- `GET /task` returns all non-deleted tasks.
- `POST /task` is the single manage endpoint:
  - create: send `title`, `details`, `current_status`
  - update: send `id` plus one or more updatable fields
  - soft-delete: send `id` and `isDelete: true`

### Example Requests

```http
POST http://localhost:8000/task
Content-Type: application/json
Cookie: access_token=<paste_access_token_here>

{
    "title": "Task 1",
    "details": "This is the description",
    "current_status": "doing"
}
```

```http
POST http://localhost:8000/task
Content-Type: application/json
Cookie: access_token=<paste_access_token_here>

{
        "id": "<task_uuid>",
        "current_status": "done"
}
```

```http
POST http://localhost:8000/task
Content-Type: application/json
Cookie: access_token=<paste_access_token_here>

{
        "id": "<task_uuid>",
        "isDelete": true
}
```

---

## Auth Flow Overview

```
User clicks login
        ↓
Backend generates OAuth URL + stores state in httpOnly cookie
        ↓
Browser redirects to Google consent screen
        ↓
Google redirects to /auth/google/callback
        ↓
Backend exchanges code for Google id_token
        ↓
Backend verifies id_token, upserts user in DB
        ↓
Backend issues access_token (15min) + refresh_token (7days)
        ↓
Both stored as httpOnly cookies
        ↓
Browser redirects to home.html
        ↓
Every protected request uses access_token cookie
        ↓
When access_token expires, refresh_token issues a new one silently
        ↓
On logout, refresh_token deleted from DB + both cookies cleared
```
