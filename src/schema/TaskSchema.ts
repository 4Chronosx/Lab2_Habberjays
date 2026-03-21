import { z } from "zod";

const taskContentFields = {
  title: z.string().min(1, "Title cannot be empty"),
  details: z.string().min(1, "Details cannot be empty"),
  current_status: z.string().min(1, "Current status cannot be empty"),
};

const deleteSchema = z
  .object({
    id: z.string().uuid("Task ID must be a valid UUID"),
    isDelete: z.literal(true),
  })
  .strict();

const updateSchema = z
  .object({
    id: z.string().uuid("Task ID must be a valid UUID"),
    title: taskContentFields.title.optional(),
    details: taskContentFields.details.optional(),
    current_status: taskContentFields.current_status.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.details !== undefined ||
      data.current_status !== undefined,
    {
      message:
        "At least one of title, details, or current_status is required for update",
    },
  );

const createSchema = z
  .object({
    ...taskContentFields,
  })
  .strict();

export const TaskSchema = z.union([deleteSchema, updateSchema, createSchema]);

export type TaskPayload = z.infer<typeof TaskSchema>;
