
import dotenv from "dotenv";
dotenv.config();

import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: false
});

/* sample use case

const { rows } = await pool.query(
  'SELECT * FROM users WHERE city = $1',
  ['New York']
);

*/          