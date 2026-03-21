import { NextFunction, Response } from "express";
import { ZodError } from "zod";
import { AuthRequest } from "./middleware";
import { TaskSchema } from "../schema/TaskSchema";

export const validateTaskPayload = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const incomingPayload = req.body ?? {};
    const normalizedPayload: Record<string, unknown> = {
      ...incomingPayload,
    };

    if (
      incomingPayload.taskId !== undefined &&
      incomingPayload.id === undefined
    ) {
      normalizedPayload.id = incomingPayload.taskId;
    }

    if (
      incomingPayload.status !== undefined &&
      incomingPayload.current_status === undefined
    ) {
      normalizedPayload.current_status = incomingPayload.status;
    }

    if (
      incomingPayload.description !== undefined &&
      incomingPayload.details === undefined
    ) {
      normalizedPayload.details = incomingPayload.description;
    }

    delete normalizedPayload.taskId;
    delete normalizedPayload.status;
    delete normalizedPayload.description;

    const parsedPayload = TaskSchema.parse(normalizedPayload);
    req.body = parsedPayload;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Invalid task payload",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return res.status(400).json({ error: "Invalid task payload" });
  }
};
