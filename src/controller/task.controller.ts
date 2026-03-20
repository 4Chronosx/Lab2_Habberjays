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

export const updateTask = async (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const updates = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!id) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  try {
    const result = await TaskService.update(id, updates);

    // ─── Broadcast to all connected WebSocket clients ────────────
    broadcast({
      type: MessageType.TASK_UPDATED,
      payload: result,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json(result);
  } catch (err: any) {
    if (err.message === "Task not found") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

export const getAllTasks = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.getAll(userId);

    // ─── Broadcast to all connected WebSocket clients ────────────
    broadcast({
      type: MessageType.TASK_GET_ALL,
      payload: { tasks: result },
      timestamp: new Date().toISOString(),
    });

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
