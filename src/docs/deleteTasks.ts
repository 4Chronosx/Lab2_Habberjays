export const deleteTaskPostDoc = {
  action: "delete",
  summary: "Delete task payload",
  description: "Needs id of the task and isDelete=true.",
  requestSchemaRef: "#/components/schemas/DeleteTaskRequest",
  example: {
    id: "f9d36d17-125a-4bc4-af1f-2f15dc42f617",
    isDelete: true,
  },
} as const;
