import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import { ServiceError } from "../utils/service-error";

const execFileAsync = promisify(execFile);
const FRAME_WIDTH = 768;
const MAX_BUFFER = 16 * 1024 * 1024;

function binary(path: string | null, name: string): string {
  if (!path) {
    throw new ServiceError(
      500,
      `${name} is not available in this environment.`,
    );
  }
  return path;
}

export type MediaWorkdir = {
  directory: string;
  cleanup: () => Promise<void>;
};

export async function createWorkdir(): Promise<MediaWorkdir> {
  const directory = await mkdtemp(join(tmpdir(), "openfranz-ingest-"));

  return {
    directory,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

export async function downloadToFile(
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

export async function probeDuration(videoPath: string): Promise<number> {
  const { stdout } = await execFileAsync(
    binary(ffprobePath.path, "ffprobe"),
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ],
    { maxBuffer: MAX_BUFFER },
  );

  const duration = Number(stdout.trim());
  return Number.isFinite(duration) ? duration : 0;
}

export async function extractAudio(
  videoPath: string,
  audioPath: string,
): Promise<void> {
  await execFileAsync(
    binary(ffmpegPath, "ffmpeg"),
    [
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
    ],
    { maxBuffer: MAX_BUFFER },
  );
}

export async function extractFrames(
  videoPath: string,
  times: number[],
  directory: string,
): Promise<string[]> {
  const unique = [...new Set(times.map((time) => Math.max(time, 0)))];
  const frames: string[] = [];

  for (const [index, time] of unique.entries()) {
    const framePath = join(directory, `frame-${index}.jpg`);
    await execFileAsync(
      binary(ffmpegPath, "ffmpeg"),
      [
        "-y",
        "-ss",
        String(time),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-vf",
        `scale=${FRAME_WIDTH}:-1`,
        "-q:v",
        "3",
        framePath,
      ],
      { maxBuffer: MAX_BUFFER },
    );
    frames.push(framePath);
  }

  return frames;
}
