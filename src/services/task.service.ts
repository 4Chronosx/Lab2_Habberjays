import { pool } from "../lib/supabase";

interface TaskProps {
    title: string,
    details: string,
    current_status: string
}

type ColumnSet = {
    hasDetails: boolean;
    hasCurrentStatus: boolean;
};

const getTaskColumns = async (): Promise<ColumnSet> => {
    const { rows } = await pool.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tasks';
        `,
    );

    const columns = new Set(rows.map((row: { column_name: string }) => row.column_name));

    return {
        hasDetails: columns.has("details"),
        hasCurrentStatus: columns.has("current_status"),
    };
};


export const TaskService = {
    add: async (task: TaskProps, userId: string): Promise<any> => {
        const { hasDetails, hasCurrentStatus } = await getTaskColumns();

        if (hasDetails && hasCurrentStatus) {
            const { rows } = await pool.query(
                `
                INSERT INTO tasks (user_id, title, details, current_status)
                VALUES($1, $2, $3, $4)
                RETURNING *;
                `,
                [userId, task.title, task.details, task.current_status]
            );
            return rows[0];
        }

        if (hasCurrentStatus) {
            const { rows } = await pool.query(
                `
                INSERT INTO tasks (user_id, title, current_status)
                VALUES($1, $2, $3)
                RETURNING *;
                `,
                [userId, task.title, task.current_status]
            );
            return rows[0];
        }

        const { rows } = await pool.query(
            `
            INSERT INTO tasks (user_id, title)
            VALUES($1, $2)
            RETURNING *;
            `,
            [userId, task.title]
        );
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

    update: async (taskId: string, task: TaskProps, userId: string): Promise<any> => {
        const { hasDetails, hasCurrentStatus } = await getTaskColumns();

        if (hasDetails && hasCurrentStatus) {
            const { rows } = await pool.query(
                `
                UPDATE tasks
                SET title = COALESCE($1, title),
                    details = COALESCE($2, details),
                    current_status = COALESCE($3, current_status)
                WHERE id = $4
                  AND user_id = $5
                  AND deleted_at IS NULL
                RETURNING *;
                `,
                [task.title, task.details, task.current_status, taskId, userId]
            );

            return rows[0] || null;
        }

        if (hasCurrentStatus) {
            const { rows } = await pool.query(
                `
                UPDATE tasks
                SET title = COALESCE($1, title),
                    current_status = COALESCE($2, current_status)
                WHERE id = $3
                  AND user_id = $4
                  AND deleted_at IS NULL
                RETURNING *;
                `,
                [task.title, task.current_status, taskId, userId]
            );

            return rows[0] || null;
        }

        const { rows } = await pool.query(
            `
            UPDATE tasks
            SET title = COALESCE($1, title)
            WHERE id = $2
              AND user_id = $3
              AND deleted_at IS NULL
            RETURNING *;
            `,
            [task.title, taskId, userId]
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