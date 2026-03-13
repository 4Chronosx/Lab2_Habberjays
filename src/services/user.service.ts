import { pool } from "../lib/supabase"

interface GoogleUser {
    googleId: string,
    email: string,
    fullname: string,
    picture: string
}

export const UserService = {
    upsert: async (data: GoogleUser) => {
        const { rows } = await pool.query(
            `SELECT * FROM Users WHERE id = $1`,
            [data.googleId]
        );

        if (!rows[0]) {
            const { rows: newRows } = await pool.query(
                `
                INSERT INTO Users (id, fullname, email, picture_url)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                `,
                [data.googleId, data.fullname, data.email, data.picture]
            );
            return newRows[0];
        }

        return rows[0];
    }
}