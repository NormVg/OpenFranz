import { z } from "zod";
import * as ingestJobRepository from "~~/server/repositories/ingest-job.repository";
import { wakeIngestWorker } from "~~/server/services/ingest-worker.service";
import { resolveInstagramShareUrl } from "~~/server/services/instagram-share.service";
import {
  canonicalInstagramUrl,
  isInstagramShareUrl,
} from "~~/shared/utils/instagram";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { ServiceError } from "~~/server/utils/service-error";
import { requireUser } from "~~/server/utils/require-user";

const bodySchema = z.object({
  url: z.string().trim().min(1, "An Instagram URL is required."),
});

export default defineServiceHandler(async (event) => {
  await requireUser(event);

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw new ServiceError(400, "An Instagram URL is required.");
  }

  const raw = parsed.data.url;

  // Links copied from the Instagram app carry query strings, and share links
  // carry no shortcode at all. Resolve both down to the canonical post URL
  // so the queue stores one reliable shape.
  let sourceUrl = canonicalInstagramUrl(raw);
  if (!sourceUrl && isInstagramShareUrl(raw)) {
    sourceUrl = await resolveInstagramShareUrl(raw.trim());
  }

  if (!sourceUrl) {
    throw new ServiceError(
      400,
      "Only public Instagram post or reel URLs are supported.",
    );
  }

  const job = await ingestJobRepository.create(sourceUrl);

  // Start the cold boot without holding the response. The client retries the
  // wake endpoint every 25 seconds until the worker is up.
  void wakeIngestWorker(5_000);

  return job;
});
