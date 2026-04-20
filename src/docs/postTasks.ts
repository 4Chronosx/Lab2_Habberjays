import { createTaskPostDoc } from "./createTasks";
import { deleteTaskPostDoc } from "./deleteTasks";
import { updateTaskPostDoc } from "./updateTasks";

export const postTaskOperation = {
  tags: ["Tasks"],
  summary: "Create, update, or delete a task",
  description:
    "Single endpoint for task mutations. Use one of the request variants below.",
  security: [
    {
      cookieAuth: [],
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/PostTaskRequest",
        },
        examples: {
          create: {
            summary: createTaskPostDoc.summary,
            description: createTaskPostDoc.description,
            value: createTaskPostDoc.example,
          },
          update: {
            summary: updateTaskPostDoc.summary,
            description: updateTaskPostDoc.description,
            value: updateTaskPostDoc.example,
          },
          delete: {
            summary: deleteTaskPostDoc.summary,
            description: deleteTaskPostDoc.description,
            value: deleteTaskPostDoc.example,
          },
        },
      },
    },
  },
  responses: {
    "200": {
      description: "Task operation completed successfully",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/Task",
          },
        },
      },
    },
    "401": {
      description: "User is not authenticated",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
        },
      },
    },
    "500": {
      description: "Server error",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ErrorResponse",
          },
        },
      },
    },
  },
  "x-task-action-docs": [
    createTaskPostDoc,
    updateTaskPostDoc,
    deleteTaskPostDoc,
  ],
} as const;
