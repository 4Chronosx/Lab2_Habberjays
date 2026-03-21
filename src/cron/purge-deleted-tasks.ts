import { pool } from "../lib/supabase";

export async function purgeDeletedTasks(): Promise<{ purgedCount: number }> {
  const retentionDays = parseInt(process.env.SOFT_DELETE_RETENTION_DAYS || "30", 10);

  try {
    const result = await pool.query(
      `DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '1 day' * $1`,
      [retentionDays]
    );

    const purgedCount = result.rowCount ?? 0;
    console.log(
      `[CRON] ${new Date().toISOString()} — Purged ${purgedCount} soft-deleted task(s) older than ${retentionDays} days`
    );

    return { purgedCount };
  } catch (error) {
    console.error(`[CRON] ${new Date().toISOString()} — Error purging soft-deleted tasks:`, error);
    throw error;
  }
}
