import { Router } from "express";
import { addTask, updateTask } from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";

const router = Router();

router.post("/add", authenticated, addTask);
router.patch("/:id", authenticated, updateTask);

export default router;
