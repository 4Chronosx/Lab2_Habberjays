export const updateTaskPostDoc = {
  action: "update",
  summary: "Update task payload",
  description:
    "Needs id of the task plus exactly one field to change: title, current_status, or description.",
  requestSchemaRef: "#/components/schemas/UpdateTaskRequest",
  example: {
    id: "f9d36d17-125a-4bc4-af1f-2f15dc42f617",
    current_status: "in-progress",
  },
} as const;
