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

    const parsedPayload = TaskSchema.parse(normalizedPayload);
    req.body = parsedPayload;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "Invalid task payload",
        description: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return res.status(400).json({ error: "Invalid task payload" });
  }
};
