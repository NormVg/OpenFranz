import { FatalError } from "workflow";
import type {
  IngestPipelineResult,
  PreparedMediaContext,
  TranscriptSegment,
} from "../../shared/types/ingest-pipeline";
import type { InstagramMediaResult } from "../../shared/utils/instagram";
import * as ingestJobRepository from "../repositories/ingest-job.repository";
import { runIngestionAgent } from "../services/ingest-agent.service";
import { fetchInstagramMedia } from "../services/instagram.service";
import {
  analyzePostImages,
  analyzeReelFrames,
  extractReelAudio,
  extractReelFrames,
  planPostImages,
  planReelFrames,
  transcribeReelAudio,
} from "../services/media-context.service";

async function loadJob(jobId: string): Promise<{ sourceUrl: string }> {
  "use step";

  const job = await ingestJobRepository.findById(jobId);
  if (!job) {
    throw new FatalError(`Ingest job ${jobId} was not found.`);
  }

  return { sourceUrl: job.sourceUrl };
}

async function markRunning(jobId: string): Promise<void> {
  "use step";

  await ingestJobRepository.markRunning(jobId);
}

async function loadMedia(sourceUrl: string): Promise<InstagramMediaResult> {
  "use step";

  return fetchInstagramMedia(sourceUrl);
}

async function extractAudioStep(videoUrl: string): Promise<string> {
  "use step";

  return extractReelAudio(videoUrl);
}

async function transcribeStep(audioUrl: string) {
  "use step";

  return transcribeReelAudio(audioUrl);
}

async function extractFramesStep(
  videoUrl: string,
  times: number[],
): Promise<string[]> {
  "use step";

  return extractReelFrames(videoUrl, times);
}

async function planFramesStep(
  segments: TranscriptSegment[],
  durationSeconds: number,
): Promise<number[]> {
  "use step";

  return planReelFrames(segments, durationSeconds);
}

async function planImagesStep(
  media: InstagramMediaResult,
): Promise<string[]> {
  "use step";

  return planPostImages(media);
}

async function analyzeFramesStep(
  frameUrls: string[],
  transcript: string,
): Promise<string> {
  "use step";

  return analyzeReelFrames(frameUrls, transcript);
}

async function analyzePostStep(imageUrls: string[]): Promise<string> {
  "use step";

  return analyzePostImages(imageUrls);
}

async function writeKnowledge(
  context: PreparedMediaContext,
): Promise<IngestPipelineResult> {
  "use step";

  return runIngestionAgent(context);
}

async function markCompleted(
  jobId: string,
  result: IngestPipelineResult,
): Promise<void> {
  "use step";

  await ingestJobRepository.markCompleted(jobId, result);
}

async function markFailed(jobId: string, message: string): Promise<void> {
  "use step";

  await ingestJobRepository.markFailed(jobId, message);
}

export async function ingestWorkflow(
  jobId: string,
): Promise<IngestPipelineResult> {
  "use workflow";

  const job = await loadJob(jobId);
  await markRunning(jobId);

  try {
    const media = await loadMedia(job.sourceUrl);
    let context: PreparedMediaContext;

    if (media.type === "video") {
      const videoUrl = media.media[0]?.url;
      if (!videoUrl) {
        throw new Error("No reel video was returned.");
      }

      const audioUrl = await extractAudioStep(videoUrl);
      const { transcription, durationSeconds } =
        await transcribeStep(audioUrl);
      const times = await planFramesStep(
        transcription.segments,
        durationSeconds,
      );
      const frameUrls = await extractFramesStep(videoUrl, times);
      const visualAnalysis = await analyzeFramesStep(
        frameUrls,
        transcription.transcript,
      );

      context = {
        sourceUrl: media.sourceUrl,
        mediaType: "reel",
        transcript: transcription.transcript,
        segments: transcription.segments,
        visualAnalysis,
        frameCount: frameUrls.length,
      };
    } else {
      const imageUrls = await planImagesStep(media);
      if (imageUrls.length === 0) {
        throw new Error("No post images were returned.");
      }

      const visualAnalysis = await analyzePostStep(imageUrls);

      context = {
        sourceUrl: media.sourceUrl,
        mediaType: "post",
        transcript: "",
        segments: [],
        visualAnalysis,
        frameCount: imageUrls.length,
      };
    }

    const result = await writeKnowledge(context);
    await markCompleted(jobId, result);
    return result;
  } catch (error) {
    await markFailed(
      jobId,
      error instanceof Error ? error.message : "Ingestion failed.",
    );
    throw error;
  }
}
