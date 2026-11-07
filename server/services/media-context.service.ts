import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  PreparedMediaContext,
  TranscriptSegment,
} from "../../shared/types/ingest-pipeline";
import type { InstagramMediaResult } from "../../shared/utils/instagram";
import { selectFrameTimes } from "../../shared/utils/ingest-pipeline";
import { ServiceError } from "../utils/service-error";
import {
  createWorkdir,
  downloadToFile,
  extractAudio,
  extractFrames,
  probeDuration,
} from "./ffmpeg.service";
import { ollamaVision } from "./ollama.service";
import { transcribeAudio } from "./sarvam-stt.service";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGES = 12;
const MAX_FRAMES = 24;
const VISION_BATCH_SIZE = 4;

function toDataUrl(buffer: Buffer): string {
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

async function analyzeImages(options: {
  images: Buffer[];
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
      .map(toDataUrl);
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

export function planReelFrames(
  segments: TranscriptSegment[],
  durationSeconds: number,
): number[] {
  return selectFrameTimes(segments, durationSeconds, MAX_FRAMES);
}

export function planPostImages(media: InstagramMediaResult): string[] {
  return media.media.slice(0, MAX_IMAGES).map((item) => item.url);
}

export async function prepareReelContext(
  sourceUrl: string,
  videoUrl: string,
): Promise<PreparedMediaContext> {
  const workdir = await createWorkdir();

  try {
    const videoPath = join(workdir.directory, "reel.mp4");
    await downloadToFile(videoUrl, videoPath, MAX_VIDEO_BYTES);

    const duration = await probeDuration(videoPath);
    const audioPath = join(workdir.directory, "audio.wav");
    await extractAudio(videoPath, audioPath);

    const audio = await readFile(audioPath);
    const transcription = await transcribeAudio(toArrayBuffer(audio), duration);
    const times = planReelFrames(transcription.segments, duration);
    const framePaths = await extractFrames(videoPath, times, workdir.directory);
    const frames = await Promise.all(framePaths.map((path) => readFile(path)));
    const visualAnalysis = await analyzeImages({
      images: frames,
      transcript: transcription.transcript,
      mediaType: "reel",
    });

    return {
      sourceUrl,
      mediaType: "reel",
      transcript: transcription.transcript,
      segments: transcription.segments,
      visualAnalysis,
      frameCount: frames.length,
    };
  } finally {
    await workdir.cleanup();
  }
}

export async function preparePostContext(
  sourceUrl: string,
  imageUrls: string[],
): Promise<PreparedMediaContext> {
  if (imageUrls.length === 0) {
    throw new ServiceError(502, "No post images were returned.");
  }

  const workdir = await createWorkdir();

  try {
    const images = await Promise.all(
      imageUrls.map(async (url, index) => {
        const path = join(workdir.directory, `post-${index}.jpg`);
        await downloadToFile(url, path, MAX_IMAGE_BYTES);
        return readFile(path);
      }),
    );
    const visualAnalysis = await analyzeImages({ images, mediaType: "post" });

    return {
      sourceUrl,
      mediaType: "post",
      transcript: "",
      segments: [],
      visualAnalysis,
      frameCount: images.length,
    };
  } finally {
    await workdir.cleanup();
  }
}
