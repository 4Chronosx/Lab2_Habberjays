import { pool } from "../lib/supabase";

interface TaskProps {
  title: string;
  details: string;
  current_status: string;
}

interface UpdateTaskProps {
  title?: string;
  details?: string;
  current_status?: string;
}

export const TaskService = {
  add: async (task: TaskProps, userId: string) => {
    const { rows } = await pool.query(
      `
            INSERT INTO tasks (user_id, title, details, current_status)
            VALUES($1, $2, $3, $4)
            RETURNING *;
            `,
      [userId, task.title, task.details, task.current_status],
    );
    return rows[0];
  },

  update: async (id: string, updates: UpdateTaskProps) => {
    const { rows } = await pool.query(
      `
            UPDATE tasks
            SET
              title = COALESCE($1, title),
              details = COALESCE($2, details),
              current_status = COALESCE($3, current_status)
            WHERE id = $4 AND deleted_at IS NULL
            RETURNING *;
            `,
      [updates.title, updates.details, updates.current_status, id],
    );

    if (rows.length === 0) {
      throw new Error("Task not found");
    }

    return rows[0];
  },
};
