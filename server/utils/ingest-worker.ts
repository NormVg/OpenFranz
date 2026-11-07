import * as ingestJobRepository from "../repositories/ingest-job.repository";
import { processInstagramIngest } from "../services/ingest-pipeline.service";

const WORKER_KEY = "__openfranzIngestWorker";

type WorkerGlobal = typeof globalThis & {
  [WORKER_KEY]?: boolean;
};

export function startIngestWorker(): void {
  const globalState = globalThis as WorkerGlobal;
  if (globalState[WORKER_KEY]) return;
  globalState[WORKER_KEY] = true;

  let running = false;

  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;

    try {
      const job = await ingestJobRepository.claimNext();
      if (!job) return;

      try {
        const result = await processInstagramIngest(job.sourceUrl);
        await ingestJobRepository.markCompleted(job.id, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ingestion failed.";
        await ingestJobRepository.markFailed(job.id, message);
      }
    } catch {
      // The next poll retries the queue when the database is available again.
    } finally {
      running = false;
    }
  };

  void ingestJobRepository.requeueStale().catch(() => undefined);
  setInterval(() => {
    void tick();
  }, 3000);
  void tick();
}
