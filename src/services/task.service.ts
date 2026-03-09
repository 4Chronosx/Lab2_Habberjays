import { pool } from "../lib/supabase";

interface TaskProps {
    title: string,
    details: string,
    current_status: string
}


export const TaskService = {
    add: async (task: TaskProps, userId: string) => {
        const { rows } = await pool.query(
            `
            INSERT INTO tasks (user_id, title, details, current_status)
            VALUES($1, $2, $3, $4)
            RETURNING *;
            `,
            [userId, task.title, task.details, task.current_status]
        )
        return rows[0];
    }
}