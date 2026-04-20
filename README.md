# Kanban App

## Prerequisites

### 1. Environment Variables

Create a `.env` file in the backend root:

```env
# Runtime
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:5500

# Optional URL/CORS config
LIVE_URL=
API_BASE_URL=http://localhost:8000
SWAGGER_SERVER_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:5500,http://localhost:5501,http://localhost:8000

# Auth
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
PG_SSL=false
PG_SSL_REJECT_UNAUTHORIZED=false

# Cron (optional)
CRON_PURGE_SCHEDULE=*/1 * * * *
SOFT_DELETE_RETENTION_DAYS=0
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

# Build TypeScript
npm run build

# Run production build
npm start

# Server will start on http://localhost:8000
```

### API Docs

Swagger UI is available at:

`http://localhost:8000/api-docs`

### Frontend

1. Open the project folder in VS Code
2. Right click `index.html` → **Open with Live Server**
3. Login page: `http://localhost:5500/#/login`
4. Board (home): `http://localhost:5500/#/board`

---

## Testing Protected Routes (REST Client)

### Setup

Install the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) in VS Code.

### How to get your access token

1. Log in through the browser at `http://localhost:5500/#/login`
2. Open **Chrome DevTools → F12 → Application → Cookies → http://localhost:8000**
3. Find `access_token` and copy its value
4. Paste it in the `Cookie` header of your requests

> ⚠️ The access token expires in **15 minutes**. If you get a `401`, log in again and copy the new token.

> ⚠️ Do **NOT** use the Google `id_token`. Only the `access_token` issued by this server works.

### Task API (Shared Board)

All authenticated users access a team-wide shared board.

- `GET /tasks` returns all non-deleted tasks.
- `POST /tasks` supports create, update, and soft-delete (legacy manage endpoint).
- `PUT /tasks/:id` updates a task (recommended update endpoint).
- `DELETE /tasks/:id` soft-deletes a task (recommended delete endpoint).

### Task Payload Rules

- Create: `title` required, `current_status` required, `description` optional.
- Update (`POST /tasks` with `id` or `PUT /tasks/:id`): at least one of `title`, `description`, `current_status`.
- Delete (legacy `POST /tasks`): `id` must be a UUID and `isDelete` must be `true`.

### Example Requests

```http
POST http://localhost:8000/tasks
Content-Type: application/json
Cookie: access_token=<paste_access_token_here>

{
        "title": "Task 1",
        "description": "This is the description",
        "current_status": "doing"
}
```

```http
POST http://localhost:8000/tasks
Content-Type: application/json
Cookie: access_token=<paste_access_token_here>

{
        "id": "<task_uuid>",
        "current_status": "done"
}
```

```http
POST http://localhost:8000/tasks
Content-Type: application/json
Cookie: access_token=<paste_access_token_here>

{
        "id": "<task_uuid>",
        "isDelete": true
}
```

```http
PUT http://localhost:8000/tasks/<task_uuid>
Content-Type: application/json
Cookie: access_token=<paste_access_token_here>

{
        "title": "Updated title"
}
```

```http
DELETE http://localhost:8000/tasks/<task_uuid>
Cookie: access_token=<paste_access_token_here>
```

---

## Auth Endpoints

- `GET /auth/google/url`: returns Google OAuth URL and sets `oauth_state` cookie.
- `GET /auth/google/callback`: OAuth callback, sets auth cookies, redirects to frontend board route.
- `GET /auth/google/verify`: returns authenticated user from access token cookie.
- `POST /auth/google/logout`: requires auth + CSRF (`x-csrf-token` header must match `csrf_token` cookie).
- `GET /auth/csrf`: sets and returns CSRF token.
- `POST /auth/google/refresh`: rotates access token using refresh token cookie.
- `GET /auth/token`: returns the current access token cookie value.

### Cookies Used

- `access_token`: JWT (`15m` expiry in token claims).
- `refresh_token`: opaque token (stored in DB, 7 days).
- `csrf_token`: used for CSRF validation on logout.
- `oauth_state`: temporary OAuth state cookie (5 minutes).

In production, auth cookies use `secure: true` and `sameSite: none`.

---

## WebSocket

WebSocket server shares the same HTTP port and requires a JWT token in query params.

Connection format:

`ws://localhost:8000?token=<access_token>`

Supported events:

- `task:created`
- `task:updated`
- `task:deleted`
- `presence:list`
- `presence:joined`
- `presence:left`
- `debug:ping` / `debug:pong`

Task events are broadcast to all connected clients.

---

## Background Cron Job

On startup, backend schedules a purge job for soft-deleted tasks.

- Default schedule: every minute (`*/1 * * * *`)
- Timezone: `Asia/Manila`
- Hard-deletes rows where `deleted_at` is older than `SOFT_DELETE_RETENTION_DAYS`

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
Browser redirects to /#/board (home)
        ↓
Every protected request uses access_token cookie
        ↓
When access_token expires, refresh_token issues a new one silently
        ↓
On logout, refresh_token deleted from DB + both cookies cleared
```
