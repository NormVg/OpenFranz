import type { IngestPipelineResult } from "../../shared/types/ingest-pipeline";
import { runIngestionAgent } from "./ingest-agent.service";
import { fetchInstagramMedia } from "./instagram.service";
import {
  planPostImages,
  preparePostContext,
  prepareReelContext,
} from "./media-context.service";

/**
 * Runs the full ingest pipeline for one source URL. The queue worker calls this
 * directly; the workflow used to compose the same steps.
 */
export async function runIngestPipeline(
  sourceUrl: string,
): Promise<IngestPipelineResult> {
  const media = await fetchInstagramMedia(sourceUrl);

  if (media.type === "video") {
    const videoUrl = media.media[0]?.url;
    if (!videoUrl) throw new Error("No reel video was returned.");

    const context = await prepareReelContext(sourceUrl, videoUrl);
    return runIngestionAgent(context);
  }

  const imageUrls = planPostImages(media);
  if (imageUrls.length === 0) {
    throw new Error("No post images were returned.");
  }

  const context = await preparePostContext(sourceUrl, imageUrls);
  return runIngestionAgent(context);
}
