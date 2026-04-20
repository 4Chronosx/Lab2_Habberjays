import http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import taskRoutes from "./routes/task.routes";
import authRoutes from "./routes/auth.routes";
import cookieParser from "cookie-parser";
import { initWebSocket } from "./websocket";
import { initCronJobs } from "./cron";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";
import { env } from "./config/env";

const app = express();
const PORT = env.port;
const allowedOrigins = env.corsOrigins;

app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      withCredentials: true,
    },
  }),
);

app.use("/tasks", taskRoutes);
app.use("/auth", authRoutes);

const server = http.createServer(app);
initWebSocket(server);
initCronJobs();

server.listen(PORT, () => {
  console.log(`Server running on ${env.apiBaseUrl || `http://localhost:${PORT}`}`);
});
