import * as ingestJobRepository from "~~/server/repositories/ingest-job.repository";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { ServiceError } from "~~/server/utils/service-error";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);

  const id = getRouterParam(event, "id");
  const job = await ingestJobRepository.findById(id ?? "");
  if (!job) {
    throw new ServiceError(404, "Ingest job not found.");
  }

  return job;
});
