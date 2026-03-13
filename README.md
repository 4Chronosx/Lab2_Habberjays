Requirements
1. Offline-first behavior - 5pts
a. Continue working offline
b. When there is an internet connection, push unsynced local changes to online
backend. Decide on what is the best way to manage conflict when syncing.
2. Authentication - 5pts
a. Users must be able to register, login, and logout
b. Use JWT
c. Implement protected API routes
d. Only store hashed password
e. Alternative: Implement Login with Google
3. REST API Endpoints - 10pts
a. POST /auth/register
b. POST /auth/login
c. GET /tasks
d. POST /tasks (Use this endpoint for creating, updating, and deleting) - soft
deletion only
e. Create Postman documentation
4. API Testing (Bonus) - 10pts
a. Create api test using postman or other methods
5. Realtime Updates (Web Sockets) - 10pts
a. When a task is created/updated/moved/deleted, all connected clients instantly
receive updates
6. Database (PostgreSQL) - 10pts
a. Have at least 2 tables: users and tasks.
b. You have flexibility on how you want to design your database.
7. Cron Job - 10pts
a. Create at least one scheduled job:
i. Clean soft-deleted tasks
ii. Archive tasks older than X days
iii. Generate daily summary logs (could be sent via email)
iv. Or you can create another feature that uses background/scheduled
job
8. Rate Limiting (Bonus) - 10pts
a. Protect API endpoints from abuse:
i. Limit requests per IP/email/ etc
