import { startIngestWorker } from "../utils/ingest-worker";

export default defineNitroPlugin(() => {
  startIngestWorker();
});
