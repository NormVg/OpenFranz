import { z } from "zod";
import * as ingestJobRepository from "~~/server/repositories/ingest-job.repository";
import { isInstagramPostUrl } from "~~/shared/utils/instagram";
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

  if (!isInstagramPostUrl(parsed.data.url)) {
    throw new ServiceError(
      400,
      "Only public Instagram post or reel URLs are supported.",
    );
  }

  return ingestJobRepository.create(parsed.data.url);
});
