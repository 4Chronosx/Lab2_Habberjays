import http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import taskRoutes from "./routes/task.routes";
import authRoutes from "./routes/auth.routes";
import cookieParser from "cookie-parser";
import { initWebSocket } from "./websocket";
import path from "path";

const app = express();
const PORT = 8000;

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = [
  "http://localhost:8000",
  "http://localhost:5500",
  "http://localhost:5501",
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
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

app.use("/task", taskRoutes);
app.use("/auth", authRoutes);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello World" });
});

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
