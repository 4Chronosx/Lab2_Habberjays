import { TaskService } from "../services/task.service";
import { Request, Response } from 'express';

export interface AuthRequest extends Request {
    userId?: string;
    token?: string;
}

export const addTask = async (req: AuthRequest, res: Response) => {
    const task = req.body;
    const userId = "1";

    try {
        const result = await TaskService.add(task, userId);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({error: err.message})
    }
}