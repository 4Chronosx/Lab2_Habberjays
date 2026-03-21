import { Router } from "express";
import { ManageTasks, getAllTasks } from "../controller/task.controller";
import { authenticated } from "../middleware/middleware";
import { validateTaskPayload } from "../middleware/validator";

const router = Router();

router.get("/", authenticated, getAllTasks);
router.post("/", authenticated, validateTaskPayload, ManageTasks);


export default router;
