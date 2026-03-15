import { TaskService } from "../services/task.service";
import { Response } from "express";
import { AuthRequest } from "../middleware/middleware";

// ─── WebSocket Integration (uncomment when ready) ────────────────────────────
// import { broadcast } from "../services/websocket.service";

export const addTask = async (req: AuthRequest, res: Response) => {
  const task = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.add(task, userId);

    // ─── Broadcast to all connected WebSocket clients ────────────
    // broadcast({
    //     type: "TASK_CREATED",
    //     payload: result,
    //     timestamp: new Date().toISOString(),
    // });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
