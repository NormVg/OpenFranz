import { z } from "zod";
import * as ingestJobRepository from "~~/server/repositories/ingest-job.repository";
import { isInstagramPostUrl } from "~~/shared/utils/instagram";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { ServiceError } from "~~/server/utils/service-error";
import { requireUser } from "~~/server/utils/require-user";

const bodySchema = z.object({
  url: z.string().trim().min(1, "An Instagram URL is required."),
});

/**
 * Nudges the Render worker so a sleeping instance wakes and drains the queue.
 * The job is already durable in Postgres, so a failed wake is not fatal.
 */
async function wakeWorker(): Promise<void> {
  const baseUrl = process.env.INGEST_WORKER_URL;
  if (!baseUrl) return;

  try {
    await fetch(`${baseUrl.replace(/\/$/, "")}/wake`, {
      method: "POST",
      headers: {
        "x-worker-secret": process.env.INGEST_WORKER_SECRET ?? "",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // The job stays queued; the worker picks it up on its next wake.
  }
}

export default defineServiceHandler(async (event) => {
  await requireUser(event);

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw new ServiceError(400, "An Instagram URL is required.");
  }

  if (!isInstagramPostUrl(parsed.data.url)) {
    throw new ServiceError(
      400,
      "Only public Instagram post or reel URLs are supported.",
    );
  }

  const job = await ingestJobRepository.create(parsed.data.url);
  await wakeWorker();
  return job;
});
