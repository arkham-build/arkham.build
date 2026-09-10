import { createPgBoss } from "../jobs/boss.ts";
import { type JobDispatcher, PgBossJobDispatcher } from "../jobs/dispatcher.ts";
import { registerQueues } from "../jobs/queues.ts";
import { configFromEnv } from "../lib/config.ts";

export async function enqueueWithDispatcher(
  enqueue: (dispatcher: JobDispatcher) => Promise<void>,
) {
  const config = configFromEnv();
  const boss = createPgBoss(config);

  await boss.start();

  try {
    await registerQueues(boss);
    await enqueue(new PgBossJobDispatcher(boss));
  } finally {
    await boss.stop();
  }
}
