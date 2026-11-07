import * as ingestJobRepository from "~~/server/repositories/ingest-job.repository";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  return ingestJobRepository.listRecent(30);
});
