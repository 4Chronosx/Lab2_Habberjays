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
    },

    list: async (userId: string) => {
        const { rows } = await pool.query(
            `
            SELECT *
            FROM tasks
            WHERE user_id = $1
              AND deleted_at IS NULL
            ORDER BY created_at DESC;
            `,
            [userId]
        );

        return rows;
    },

    update: async (taskId: string, task: TaskProps, userId: string) => {
        const { rows } = await pool.query(
            `
            UPDATE tasks
            SET title = $1,
                details = $2,
                current_status = $3
            WHERE id = $4
              AND user_id = $5
              AND deleted_at IS NULL
            RETURNING *;
            `,
            [task.title, task.details, task.current_status, taskId, userId]
        );

        return rows[0] || null;
    },

    remove: async (taskId: string, userId: string) => {
        const { rows } = await pool.query(
            `
            UPDATE tasks
            SET deleted_at = NOW()
            WHERE id = $1
              AND user_id = $2
              AND deleted_at IS NULL
            RETURNING *;
            `,
            [taskId, userId]
        );

        return rows[0] || null;
    }
}