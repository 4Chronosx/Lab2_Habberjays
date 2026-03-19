import { NextFunction, Response } from "express";
import { AuthRequest } from "./middleware";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

export const validateCreateTask = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { title, details, current_status } = req.body ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "Title is required" });
  }

  if (typeof current_status !== "string" || current_status.trim() === "") {
    return res.status(400).json({ error: "Current status is required" });
  }

  req.body = { title, details, current_status };
  next();
};

export const validateUpdateTask = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id || !isValidUUID(id)) {
    return res.status(400).json({ error: "Invalid task ID format" });
  }

  const { title, details, current_status } = req.body ?? {};
  req.body = { title, details, current_status };
  next();
};

export const validateDeleteTask = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const { id, deleted } = req.body ?? {};

  if (typeof id !== "string" || !isValidUUID(id)) {
    return res.status(400).json({ error: "Valid task ID is required" });
  }

  if (deleted !== true) {
    return res.status(400).json({ error: "Field 'deleted' must be true" });
  }

  req.body = { id, deleted };
  next();
};