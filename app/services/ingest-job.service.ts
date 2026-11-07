import type { IngestJobRecord } from "~~/shared/types/ingest-pipeline";
import {
  cachedResponse,
  invalidateResponseCache,
} from "~/utils/response-cache";

const LIST_TTL_MS = 2_000;
const JOB_TTL_MS = 1_000;

export const ingestJobService = {
  list(): Promise<IngestJobRecord[]> {
    return cachedResponse("ingest:jobs", LIST_TTL_MS, () =>
      $fetch<IngestJobRecord[]>("/api/ingest/jobs"),
    );
  },

  async enqueueInstagram(url: string): Promise<IngestJobRecord> {
    const job = await $fetch<IngestJobRecord>("/api/ingest/instagram", {
      method: "POST",
      body: { url },
    });
    invalidateResponseCache("ingest:");
    return job;
  },

  wake(): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>("/api/ingest/wake", { method: "POST" });
  },

  get(id: string): Promise<IngestJobRecord> {
    return cachedResponse(`ingest:job:${id}`, JOB_TTL_MS, () =>
      $fetch<IngestJobRecord>(`/api/ingest/jobs/${id}`),
    );
  },
};
