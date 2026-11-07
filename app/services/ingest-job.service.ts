import type { IngestJobRecord } from "~~/shared/types/ingest-pipeline";

export const ingestJobService = {
  enqueueInstagram(url: string): Promise<IngestJobRecord> {
    return $fetch<IngestJobRecord>("/api/ingest/instagram", {
      method: "POST",
      body: { url },
    });
  },

  get(id: string): Promise<IngestJobRecord> {
    return $fetch<IngestJobRecord>(`/api/ingest/jobs/${id}`);
  },
};
