import type { PgBoss } from "pg-boss";
import type { Mailer } from "../../lib/email/mailer.ts";
import { type DeliverEmailJobData, EMAIL_DELIVER_QUEUE } from "../job-types.ts";

export async function registerEmailWorker(boss: PgBoss, mailer: Mailer) {
  await boss.work<DeliverEmailJobData>(EMAIL_DELIVER_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await mailer.send(job.data.to, job.data.subject, job.data.text);
    }
  });
}
