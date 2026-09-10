import { createPgBoss } from "./jobs/boss.ts";
import { registerQueues } from "./jobs/queues.ts";
import { registerSchedules } from "./jobs/schedules.ts";
import { registerEmailWorker } from "./jobs/workers/email.ts";
import { registerTaskWorkers } from "./jobs/workers/tasks.ts";
import { configFromEnv } from "./lib/config.ts";
import { SMTPMailer } from "./lib/email/mailer.ts";
import { log } from "./lib/logger.ts";

const shutdownSignals = ["SIGINT", "SIGTERM"] as const;

await main();

async function main() {
  const config = configFromEnv();
  const boss = createPgBoss(config);

  await boss.start();
  await registerQueues(boss);
  await registerEmailWorker(boss, new SMTPMailer(config));
  await registerTaskWorkers(boss);

  if (config.ENABLE_JOB_SCHEDULES) {
    await registerSchedules(boss);
  }

  log("info", "Worker started");

  await new Promise<void>((resolve, reject) => {
    let stopping = false;

    function stop(signal: (typeof shutdownSignals)[number]) {
      if (stopping) return;
      stopping = true;

      void (async () => {
        log("info", "Stopping worker", { signal });
        await boss.stop();
        log("info", "Worker stopped", { signal });
        resolve();
      })().catch(reject);
    }

    for (const signal of shutdownSignals) {
      process.once(signal, () => stop(signal));
    }
  });
}
