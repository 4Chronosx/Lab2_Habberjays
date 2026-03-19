import { Router } from "express";
import { addTask, deleteTask, updateTask } from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";
import {
	validateCreateTask,
	validateDeleteTask,
	validateUpdateTask,
} from "../middleware/validation";

const router = Router();

router.post("/add", authenticated, validateCreateTask, addTask);
router.patch("/:id", authenticated, validateUpdateTask, updateTask);
// TODO: Integrate into unified POST /tasks endpoint (task d)
router.post("/delete", authenticated, validateDeleteTask, deleteTask);

export default router;
