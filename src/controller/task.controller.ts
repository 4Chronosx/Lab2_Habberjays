import { TaskService } from "../services/task.service";
import { Response } from "express";
import { AuthRequest } from "../middleware/middleware";
import { broadcast, MessageType } from "../services/websocket.service";

export const ManageTasks = async (req: AuthRequest, res: Response) => {
  const taskId = req.body.id;
  const isDelete = req.body.isDelete;
  const task = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    let result;
    let messageType;

    if (taskId && !isDelete) {
      // ─── Update existing task ─────────────────────────────────────
      result = await TaskService.update(taskId, task);
      messageType = MessageType.TASK_UPDATED;
    } else if (taskId && isDelete) {
      // ─── Delete existing task ─────────────────────────────────────
      result = await TaskService.delete(taskId);
      messageType = MessageType.TASK_DELETED;
    } else {
      // ─── Add new task ─────────────────────────────────────
      result = await TaskService.add(userId, task);
      messageType = MessageType.TASK_CREATED;
    }
    
    // ─── Broadcast to all connected WebSocket clients ────────────
    broadcast({
      type: messageType,
      payload: result,
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllTasks = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await TaskService.getAll();

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
