import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { PreparedMediaContext } from "../../shared/types/ingest-pipeline";
import { selectFrameTimes } from "../../shared/utils/ingest-pipeline";
import { ServiceError } from "../utils/service-error";
import { fetchInstagramMedia } from "./instagram.service";
import { ollamaVision } from "./ollama.service";
import { transcribeAudio } from "./sarvam-stt.service";

const execFileAsync = promisify(execFile);
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_IMAGES = 12;
const MAX_FRAMES = 24;
const SCENE_THRESHOLD = 0.08;

async function downloadToFile(
  url: string,
  destination: string,
  maxBytes: number,
): Promise<void> {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new ServiceError(502, `Media download failed (${response.status}).`);
  }

  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    throw new ServiceError(413, "The media file is too large to ingest.");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) {
    throw new ServiceError(413, "The media file is too large to ingest.");
  }

  await writeFile(destination, Buffer.from(buffer));
}

async function runFfmpeg(args: string[]): Promise<void> {
  await execFileAsync("ffmpeg", args, {
    maxBuffer: 16 * 1024 * 1024,
  });
}

async function probeDuration(videoPath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ],
    { maxBuffer: 1024 * 1024 },
  );

  const duration = Number(stdout.trim());
  return Number.isFinite(duration) ? duration : 0;
}

async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  await runFfmpeg([
    "-y",
    "-i",
    videoPath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-f",
    "wav",
    audioPath,
  ]);
}

/**
 * Best-effort visual cut detection. Scene detection is an optimisation, so a
 * failure here must never fail the ingestion.
 */
async function detectSceneTimes(videoPath: string): Promise<number[]> {
  try {
    const { stderr } = await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-i",
        videoPath,
        "-filter:v",
        `select='gt(scene,${SCENE_THRESHOLD})',showinfo`,
        "-f",
        "null",
        "-",
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );

    return [...stderr.matchAll(/pts_time:([0-9.]+)/g)]
      .map((match) => Number(match[1]))
      .filter((time) => Number.isFinite(time) && time > 0.2);
  } catch {
    return [];
  }
}

async function extractFrames(
  videoPath: string,
  directory: string,
  times: number[],
): Promise<string[]> {
  const frames: string[] = [];

  for (const [index, time] of times.entries()) {
    const framePath = join(directory, `frame-${index}.jpg`);
    await runFfmpeg([
      "-y",
      "-ss",
      String(time),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=768:-1",
      "-q:v",
      "3",
      framePath,
    ]);
    frames.push(framePath);
  }

  return frames;
}

async function asDataUrl(path: string): Promise<string> {
  const buffer = await readFile(path);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function analyzeImages(options: {
  images: string[];
  transcript?: string;
  mediaType: "reel" | "post";
}): Promise<string> {
  const analyses: string[] = [];

  for (let index = 0; index < options.images.length; index += 4) {
    const batch = options.images.slice(index, index + 4);
    const dataUrls = await Promise.all(batch.map(asDataUrl));
    const prompt = options.mediaType === "reel"
      ? `These are frames from an Instagram Reel, ordered by timestamp. The speech transcript is:\n${options.transcript ?? "(no speech detected)"}\n\nDescribe the visible text, visuals, demonstrations, editing patterns, and storytelling techniques in these frames. Connect what is shown to what is said. Be specific and do not invent details.`
      : "These are images from a public Instagram post. Transcribe useful visible text and describe the layout, examples, writing patterns, hooks, and teaching techniques. Be specific and do not invent details.";

    const analysis = await ollamaVision({
      text: prompt,
      images: dataUrls,
    });
    analyses.push(analysis);
  }

  return analyses.join("\n\n");
}

export async function prepareInstagramContext(
  sourceUrl: string,
): Promise<PreparedMediaContext> {
  const media = await fetchInstagramMedia(sourceUrl);
  const directory = await mkdtemp(join(tmpdir(), "openfranz-ingest-"));

  try {
    if (media.type === "video") {
      const videoUrl = media.media[0]?.url;
      if (!videoUrl) throw new ServiceError(502, "No reel video was returned.");

      const videoPath = join(directory, "reel.mp4");
      await downloadToFile(videoUrl, videoPath, MAX_VIDEO_BYTES);

      const duration = await probeDuration(videoPath);
      const audioPath = join(directory, "audio.wav");
      const [sceneTimes] = await Promise.all([
        detectSceneTimes(videoPath),
        extractAudio(videoPath, audioPath),
      ]);
      const transcription = await transcribeAudio(audioPath, duration);
      const times = selectFrameTimes(
        transcription.segments,
        duration,
        MAX_FRAMES,
        sceneTimes,
      );
      const framePaths = await extractFrames(videoPath, directory, times);
      const visualAnalysis = await analyzeImages({
        images: framePaths,
        transcript: transcription.transcript,
        mediaType: "reel",
      });

      return {
        sourceUrl,
        mediaType: "reel",
        transcript: transcription.transcript,
        segments: transcription.segments,
        visualAnalysis,
        frameCount: framePaths.length,
      };
    }

    const images = media.media.slice(0, MAX_IMAGES);
    if (images.length === 0) {
      throw new ServiceError(502, "No post images were returned.");
    }

    const paths: string[] = [];
    for (const [index, item] of images.entries()) {
      const path = join(directory, `post-${index}.jpg`);
      await downloadToFile(item.url, path, MAX_IMAGE_BYTES);
      paths.push(path);
    }

    const visualAnalysis = await analyzeImages({
      images: paths,
      mediaType: "post",
    });

    return {
      sourceUrl,
      mediaType: "post",
      transcript: "",
      segments: [],
      visualAnalysis,
      frameCount: paths.length,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
