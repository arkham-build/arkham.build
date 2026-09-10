import { enqueueWithDispatcher } from "./enqueue.ts";

await enqueueWithDispatcher(async (dispatcher) => {
  await dispatcher.enqueueIngestArkhamDbDecklists();
});
