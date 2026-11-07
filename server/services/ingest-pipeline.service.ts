import type { IngestPipelineResult } from "../../shared/types/ingest-pipeline";
import { runIngestionAgent } from "./ingest-agent.service";
import { prepareInstagramContext } from "./media-context.service";

export async function processInstagramIngest(
  sourceUrl: string,
): Promise<IngestPipelineResult> {
  const context = await prepareInstagramContext(sourceUrl);
  return runIngestionAgent(context);
}
