import { wakeIngestWorker } from "~~/server/services/ingest-worker.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);

  const ok = await wakeIngestWorker();
  return { ok };
});
