import { TaskService } from "../services/task.service";
import { Response } from "express";
import { AuthRequest } from "../middleware/middleware";
import {
  broadcastTaskEvent,
  MessageActor,
  MessageType,
} from "../services/websocket.service";

function getActor(req: AuthRequest): MessageActor | undefined {
  const email = req.user?.email;
  const userId = req.user?.userId;
  const name = req.user?.name;
  const pictureUrl = req.user?.picture_url || req.user?.pictureUrl;

  if (!email || typeof email !== "string" || !userId || typeof userId !== "string") {
    return undefined;
  }

  return {
    user_id: userId,
    user_name: typeof name === "string" ? name : email,
    email,
    picture_url: typeof pictureUrl === "string" ? pictureUrl : undefined,
    userId,
    name: typeof name === "string" ? name : undefined,
  };
}

function getActorLogValue(actor: MessageActor | undefined): string {
  if (actor?.user_id) {
    return actor.user_id;
  }

  if (actor?.userId) {
    return actor.userId;
  }

  if (actor?.email) {
    return actor.email;
  }

  return "unknown";
}

function logTaskBroadcast(
  type: string,
  id: string,
  actor: MessageActor | undefined,
  recipients: number,
): void {
  console.log(
    `Broadcasting ${type} id=${id} actor=${actor?.user_id ?? getActorLogValue(actor)} recipients=${recipients}`,
  );
}

export const ManageTasks = async (req: AuthRequest, res: Response) => {
  const taskId = req.body.id;
  const isDelete = req.body.isDelete;
  const task = req.body;
  const userId = req.user?.userId;
  const actor = getActor(req);

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

    const payload =
      messageType === MessageType.TASK_DELETED ? { id: taskId } : result;

    const recipients = broadcastTaskEvent(messageType, payload, actor);
    const taskIdForLog =
      typeof payload.id === "string" ? payload.id : String(taskId);

    logTaskBroadcast(messageType, taskIdForLog, actor, recipients);

    res.json(result);
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
    const result = await TaskService.getAll();

    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updates = req.body ?? {};
  const actor = getActor(req);

  if (!taskId) {
    return res.status(400).json({ error: "Task id is required" });
  }

  if (
    updates.title === undefined &&
    updates.description === undefined &&
    updates.current_status === undefined
  ) {
    return res.status(400).json({
      error:
        "At least one of title, description, or current_status is required for update",
    });
  }

  try {
    const result = await TaskService.update(taskId, updates);
    const recipients = broadcastTaskEvent(MessageType.TASK_UPDATED, result, actor);

    logTaskBroadcast(MessageType.TASK_UPDATED, result.id, actor, recipients);

    res.status(200).json(result);
  } catch (err: any) {
    if (err.message === "Task not found") {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const actor = getActor(req);

  if (!taskId) {
    return res.status(400).json({ error: "Task id is required" });
  }

  try {
    const result = await TaskService.delete(taskId);
    const recipients = broadcastTaskEvent(
      MessageType.TASK_DELETED,
      { id: taskId },
      actor,
    );

    logTaskBroadcast(MessageType.TASK_DELETED, taskId, actor, recipients);

    res.status(200).json(result);
  } catch (err: any) {
    if (err.message === "Task not found") {
      return res.status(404).json({ error: err.message });
    }

    res.status(500).json({ error: err.message });
  }
};
