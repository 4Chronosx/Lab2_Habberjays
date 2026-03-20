import { Router } from "express";
import { addTask, updateTask, getAllTasks } from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";

const router = Router();

router.post("/add", authenticated, addTask);
router.patch("/:id", authenticated, updateTask);
router.get("/getAll", authenticated, getAllTasks);

export default router;
