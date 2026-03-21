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
    const parsedPayload = TaskSchema.parse(req.body);
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
