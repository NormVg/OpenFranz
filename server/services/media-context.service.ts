import { Buffer } from "node:buffer";
import type { TranscriptSegment } from "../../shared/types/ingest-pipeline";
import type { InstagramMediaResult } from "../../shared/utils/instagram";
import {
  selectFrameTimes,
  wavDurationSeconds,
} from "../../shared/utils/ingest-pipeline";
import { ServiceError } from "../utils/service-error";
import { ollamaVision } from "./ollama.service";
import { extractAudio, extractFrames } from "./rendi.service";
import { transcribeAudio } from "./sarvam-stt.service";
import type { SarvamTranscription } from "./sarvam-stt.service";

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_FRAME_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGES = 12;
const MAX_FRAMES = 24;
const VISION_BATCH_SIZE = 4;

async function fetchArrayBuffer(
  url: string,
  maxBytes: number,
  label: string,
): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new ServiceError(
      502,
      `Rendi ${label} download failed (${response.status}).`,
    );
  }

  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    throw new ServiceError(413, `The ${label} file is too large to ingest.`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new ServiceError(413, `The ${label} file is too large to ingest.`);
  }

  return buffer;
}

function toDataUrl(buffer: ArrayBuffer, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
}

async function analyzeImages(options: {
  images: ArrayBuffer[];
  transcript?: string;
  mediaType: "reel" | "post";
}): Promise<string> {
  const analyses: string[] = [];

  for (
    let index = 0;
    index < options.images.length;
    index += VISION_BATCH_SIZE
  ) {
    const batch = options.images
      .slice(index, index + VISION_BATCH_SIZE)
      .map((buffer) => toDataUrl(buffer, "image/jpeg"));
    const prompt = options.mediaType === "reel"
      ? `These are frames from an Instagram Reel, ordered by timestamp. The speech transcript is:\n${options.transcript ?? "(no speech detected)"}\n\nDescribe the visible text, visuals, demonstrations, editing patterns, and storytelling techniques in these frames. Connect what is shown to what is said. Be specific and do not invent details.`
      : "These are images from a public Instagram post. Transcribe useful visible text and describe the layout, examples, writing patterns, hooks, and teaching techniques. Be specific and do not invent details.";

    const analysis = await ollamaVision({
      text: prompt,
      images: batch,
    });
    analyses.push(analysis);
  }

  return analyses.join("\n\n");
}

export async function extractReelAudio(videoUrl: string): Promise<string> {
  return extractAudio(videoUrl);
}

export async function transcribeReelAudio(
  audioUrl: string,
): Promise<{ transcription: SarvamTranscription; durationSeconds: number }> {
  const audio = await fetchArrayBuffer(audioUrl, MAX_AUDIO_BYTES, "audio");
  const durationSeconds = wavDurationSeconds(audio);
  const transcription = await transcribeAudio(audio, durationSeconds);

  return { transcription, durationSeconds };
}

export function planReelFrames(
  segments: TranscriptSegment[],
  durationSeconds: number,
): number[] {
  return selectFrameTimes(segments, durationSeconds, MAX_FRAMES);
}

export function planPostImages(media: InstagramMediaResult): string[] {
  return media.media.slice(0, MAX_IMAGES).map((item) => item.url);
}

export async function extractReelFrames(
  videoUrl: string,
  times: number[],
): Promise<string[]> {
  return extractFrames(videoUrl, times);
}

export async function analyzeReelFrames(
  frameUrls: string[],
  transcript: string,
): Promise<string> {
  const frames = await Promise.all(
    frameUrls.map((url) => fetchArrayBuffer(url, MAX_FRAME_BYTES, "frame")),
  );

  return analyzeImages({
    images: frames,
    transcript,
    mediaType: "reel",
  });
}

export async function analyzePostImages(imageUrls: string[]): Promise<string> {
  const images = await Promise.all(
    imageUrls.map((url) => fetchArrayBuffer(url, MAX_IMAGE_BYTES, "image")),
  );

  return analyzeImages({ images, mediaType: "post" });
}
