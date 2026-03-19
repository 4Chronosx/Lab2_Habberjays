import { TaskService } from "../services/task.service";
import { Response } from "express";
import { AuthRequest } from "../middleware/middleware";
import { broadcast, MessageType } from "../services/websocket.service";

export const addTask = async (req: AuthRequest, res: Response) => {
  const task = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.add(task, userId);

    // ─── Broadcast to all connected WebSocket clients ────────────
    broadcast({
      type: MessageType.TASK_CREATED,
      payload: result,
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const listTasks = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.list(userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const taskId = req.params.id;
  const task = req.body;
  const userId = req.user?.userId;

  if (typeof taskId !== "string") {
    return res.status(400).json({ error: "Invalid task id" });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.update(taskId, task, userId);

    if (!result) {
      return res.status(404).json({ error: "Task not found" });
    }

    broadcast({
      type: MessageType.TASK_UPDATED,
      payload: result,
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const taskId = req.params.id;
  const userId = req.user?.userId;

  if (typeof taskId !== "string") {
    return res.status(400).json({ error: "Invalid task id" });
  }

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.remove(taskId, userId);

    if (!result) {
      return res.status(404).json({ error: "Task not found" });
    }

    broadcast({
      type: MessageType.TASK_DELETED,
      payload: { id: taskId },
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, id: taskId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
