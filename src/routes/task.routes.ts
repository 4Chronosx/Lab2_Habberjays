import { Router } from "express";
import { addTask } from "../controller/task.controller";

const router = Router();

router.post("/add", addTask)

export default router;