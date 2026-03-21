export const getAllTasksOperation = {
  tags: ["Tasks"],
  summary: "Get all tasks",
  description:
    "Returns all non-deleted tasks ordered by created_at descending. Requires browser cookie authentication.",
  security: [
    {
      cookieAuth: [],
    },
  ],
  responses: {
    "200": {
      description: "Tasks fetched successfully",
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/TaskListResponse",
          },
          examples: {
            success: {
              value: [
                {
                  id: "f9d36d17-125a-4bc4-af1f-2f15dc42f617",
                  user_id: "14e2fbed-74fe-405c-b47a-dbb0f72ce8e1",
                  title: "Finalize sprint board",
                  details: "Move all done issues and update blockers.",
                  current_status: "in-progress",
                  created_at: "2026-03-22T09:30:00.000Z",
                  updated_at: "2026-03-22T10:15:00.000Z",
                  deleted_at: null,
                },
              ],
            },
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
} as const;
