import cron from "node-cron";
import { purgeDeletedTasks } from "./purge-deleted-tasks";

export function initCronJobs(): void {
  const schedule = process.env.CRON_PURGE_SCHEDULE || "0 0 * * *";

  if (!cron.validate(schedule)) {
    console.error(`[CRON] Invalid cron schedule: ${schedule}`);
    return;
  }

  cron.schedule(schedule, async () => {
    await purgeDeletedTasks();
  }, { timezone: "UTC" });

  console.log(`[CRON] Cron jobs initialized. Purge schedule: ${schedule}`);
}
