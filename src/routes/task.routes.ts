import { Router } from "express";
import { addTask } from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";

const router = Router();

router.post("/add", authenticated, addTask)

export default router;