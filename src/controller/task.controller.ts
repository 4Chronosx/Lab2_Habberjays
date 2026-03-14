import { TaskService } from "../services/task.service";
import { Response } from 'express';
import { AuthRequest } from '../middleware/middleware';

export const addTask = async (req: AuthRequest, res: Response) => {
    const task = req.body;
    const userId = req.user?.userId; 

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const result = await TaskService.add(task, userId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}