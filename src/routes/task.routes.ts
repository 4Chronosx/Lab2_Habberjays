import { Router } from "express";
import { addTask, deleteTask, listTasks, updateTask } from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";

const router = Router();

router.get("/list", authenticated, listTasks)
router.post("/add", authenticated, addTask)
router.put("/:id", authenticated, updateTask)
router.delete("/:id", authenticated, deleteTask)

export default router;