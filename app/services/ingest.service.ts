import type { IngestInput, IngestResult } from "~~/shared/types/ingest";

export const ingestService = {
  run(input: IngestInput): Promise<IngestResult> {
    return $fetch<IngestResult>("/api/ingest", {
      method: "POST",
      body: input,
    });
  },
};
