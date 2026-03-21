export const taskSchemas = {
  Task: {
    type: "object",
    description: "Task object returned by the API",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        example: "f9d36d17-125a-4bc4-af1f-2f15dc42f617",
      },
      user_id: {
        type: "string",
        format: "uuid",
        example: "14e2fbed-74fe-405c-b47a-dbb0f72ce8e1",
      },
      title: {
        type: "string",
        example: "Finalize sprint board",
      },
      description: {
        type: "string",
        example: "Move all done issues and update blockers.",
      },
      current_status: {
        type: "string",
        example: "in-progress",
      },
      created_at: {
        type: "string",
        format: "date-time",
        example: "2026-03-22T09:30:00.000Z",
      },
      updated_at: {
        type: "string",
        format: "date-time",
        example: "2026-03-22T10:15:00.000Z",
      },
      deleted_at: {
        type: "string",
        format: "date-time",
        nullable: true,
        example: null,
      },
    },
    required: [
      "id",
      "user_id",
      "title",
      "description",
      "current_status",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
  },
  TaskListResponse: {
    type: "array",
    items: {
      $ref: "#/components/schemas/Task",
    },
  },
  ErrorResponse: {
    type: "object",
    description:
      "Error response shape. Depending on where auth fails, the API currently returns message or error.",
    properties: {
      message: {
        type: "string",
        example: "Unauthorized",
      },
      error: {
        type: "string",
        example: "Unauthorized",
      },
    },
  },
  CreateTaskRequest: {
    type: "object",
    description:
      "Create task payload: needs title and current_status, with optional details.",
    properties: {
      title: {
        type: "string",
        minLength: 1,
      },
      current_status: {
        type: "string",
        minLength: 1,
      },
      description: {
        type: "string",
      },
    },
    required: ["title", "current_status"],
    additionalProperties: false,
  },
  UpdateTaskRequest: {
    description:
      "Update task payload: requires id if of the task and exactly one of title, current_status, or details.",
    oneOf: [
      {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          title: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["id", "title"],
        additionalProperties: false,
      },
      {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          current_status: {
            type: "string",
            minLength: 1,
          },
        },
        required: ["id", "current_status"],
        additionalProperties: false,
      },
      {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          description: {
            type: "string",
          },
        },
        required: ["id", "description"],
        additionalProperties: false,
      },
    ],
  },
  DeleteTaskRequest: {
    type: "object",
    description: "Delete task payload: requires id and isDelete=true.",
    properties: {
      id: {
        type: "string",
        format: "uuid",
      },
      isDelete: {
        type: "boolean",
        enum: [true],
      },
    },
    required: ["id", "isDelete"],
    additionalProperties: false,
  },
  PostTaskRequest: {
    oneOf: [
      {
        $ref: "#/components/schemas/CreateTaskRequest",
      },
      {
        $ref: "#/components/schemas/UpdateTaskRequest",
      },
      {
        $ref: "#/components/schemas/DeleteTaskRequest",
      },
    ],
  },
} as const;
