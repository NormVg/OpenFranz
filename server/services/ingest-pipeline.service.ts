import type { IngestPipelineResult } from "../../shared/types/ingest-pipeline";
import { runIngestionAgent } from "./ingest-agent.service";
import { fetchInstagramMedia } from "./instagram.service";
import {
  analyzePostImages,
  analyzeReelFrames,
  extractReelAudio,
  extractReelFrames,
  planPostImages,
  planReelFrames,
  transcribeReelAudio,
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

    const audioUrl = await extractReelAudio(videoUrl);
    const { transcription, durationSeconds } =
      await transcribeReelAudio(audioUrl);
    const times = planReelFrames(transcription.segments, durationSeconds);
    const frameUrls = await extractReelFrames(videoUrl, times);
    const visualAnalysis = await analyzeReelFrames(
      frameUrls,
      transcription.transcript,
    );

    return runIngestionAgent({
      sourceUrl,
      mediaType: "reel",
      transcript: transcription.transcript,
      segments: transcription.segments,
      visualAnalysis,
      frameCount: frameUrls.length,
    });
  }

  const imageUrls = planPostImages(media);
  if (imageUrls.length === 0) {
    throw new Error("No post images were returned.");
  }

  const visualAnalysis = await analyzePostImages(imageUrls);

  return runIngestionAgent({
    sourceUrl,
    mediaType: "post",
    transcript: "",
    segments: [],
    visualAnalysis,
    frameCount: imageUrls.length,
  });
}
