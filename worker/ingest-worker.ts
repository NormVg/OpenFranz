import { createServer } from "node:http";
import * as ingestJobRepository from "../server/repositories/ingest-job.repository";
import { runIngestPipeline } from "../server/services/ingest-pipeline.service";

const POLL_INTERVAL_MS = Number(process.env.INGEST_POLL_INTERVAL_MS ?? 5_000);
const PORT = Number(process.env.PORT ?? 10_000);
const SECRET = process.env.INGEST_WORKER_SECRET ?? "";

let draining = false;

async function drain(): Promise<void> {
  if (draining) return;
  draining = true;

  try {
    while (true) {
      const job = await ingestJobRepository.claimNext();
      if (!job) break;

      try {
        const result = await runIngestPipeline(job.sourceUrl);
        await ingestJobRepository.markCompleted(job.id, result);
        console.log(`[ingest] completed ${job.id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ingestion failed.";
        await ingestJobRepository.markFailed(job.id, message);
        console.error(`[ingest] failed ${job.id}: ${message}`);
      }
    }
  } catch (error) {
    console.error("[ingest] queue error:", error);
  } finally {
    draining = false;
  }
}

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok");
    return;
  }

  if (request.url === "/wake" && request.method === "POST") {
    if (SECRET && request.headers["x-worker-secret"] !== SECRET) {
      response.writeHead(401, { "content-type": "text/plain" });
      response.end("unauthorized");
      return;
    }

    response.writeHead(202, { "content-type": "text/plain" });
    response.end("accepted");
    void drain();
    return;
  }

  response.writeHead(404, { "content-type": "text/plain" });
  response.end("not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[ingest] worker listening on ${PORT}`);
});

void ingestJobRepository
  .requeueStale()
  .catch((error) => console.error("[ingest] requeue failed:", error));

setInterval(() => void drain(), POLL_INTERVAL_MS);
void drain();

function shutdown(): void {
  server.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
