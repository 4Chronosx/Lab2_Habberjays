import { getAllTasksOperation } from "./getAllTasks";
import { postTaskOperation } from "./postTasks";
import { taskSchemas } from "./schemas";

export const swaggerSpec = {
  openapi: "3.1.0",
  info: {
    title: "Kanban Backend API",
    version: "1.0.0",
    description:
      "Swagger documentation for authenticated task routes using cookie-based access token auth.",
  },
  servers: [
    {
      url: process.env.LIVE_URL,
      description: "Server",
    },
  ],
  tags: [
    {
      name: "Tasks",
      description: "Task operations",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "access_token",
        description:
          "JWT access token sent as browser cookie. Swagger UI requests should include credentials.",
      },
    },
    schemas: taskSchemas,
  },
  paths: {
    "/tasks": {
      get: getAllTasksOperation,
      post: postTaskOperation,
    },
  },
};
