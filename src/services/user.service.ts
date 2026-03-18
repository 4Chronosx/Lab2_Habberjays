import { pool } from "../lib/supabase";

interface GoogleUser {
    googleId: string,
    email: string,
    fullname: string,
    picture: string
}

export const UserService = {
    upsert: async (data: GoogleUser) => {
        const { rows } = await pool.query(
            `
            INSERT INTO Users (id, fullname, email, picture_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id)
            DO UPDATE SET
                fullname = EXCLUDED.fullname,
                email = EXCLUDED.email,
                picture_url = EXCLUDED.picture_url
            RETURNING *
            `,
            [data.googleId, data.fullname, data.email, data.picture]
        );
        return rows[0];
    },

    findById: async (userId: string) => {
        const { rows } = await pool.query(
            `SELECT * FROM Users WHERE id = $1`,
            [userId]
        );
        return rows[0];
    }
}