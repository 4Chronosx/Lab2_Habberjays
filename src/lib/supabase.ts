import { Pool } from 'pg';
import { env } from "../config/env";

const sslConfig = env.pgSsl
  ? { rejectUnauthorized: env.pgSslRejectUnauthorized }
  : false;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: sslConfig,
});

         