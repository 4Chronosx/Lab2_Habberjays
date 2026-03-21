export const createTaskPostDoc = {
  action: "create",
  summary: "Create task payload",
  description: "Needs title and current_status. Details is optional.",
  requestSchemaRef: "#/components/schemas/CreateTaskRequest",
  example: {
    title: "Write integration tests",
    current_status: "todo",
    details: "Cover websocket broadcast events.",
  },
} as const;
