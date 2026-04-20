import { Router } from "express";
import {
	deleteTask,
	ManageTasks,
	getAllTasks,
	updateTask,
} from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";
import { validateTaskPayload } from "../middleware/validator";

const router = Router();

router.get("/", authenticated, getAllTasks);
router.post("/", authenticated, validateTaskPayload, ManageTasks);
router.put("/:id", authenticated, updateTask);
router.delete("/:id", authenticated, deleteTask);


export default router;
