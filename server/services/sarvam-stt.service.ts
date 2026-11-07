import { readFile } from "node:fs/promises";
import type { TranscriptSegment } from "../../shared/types/ingest-pipeline";
import { ServiceError } from "../utils/service-error";

type SarvamResponse = {
  transcript?: string;
  text?: string;
  timestamps?: {
    words?: string[];
    start_time_seconds?: number[];
    end_time_seconds?: number[];
  };
  chunks?: Array<{
    text?: string;
    start?: number;
    end?: number;
    start_time?: number;
    end_time?: number;
    start_time_seconds?: number;
    end_time_seconds?: number;
  }>;
};

export type SarvamTranscription = {
  transcript: string;
  segments: TranscriptSegment[];
};

function groupWords(
  words: string[],
  starts: number[],
  ends: number[],
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  let current: TranscriptSegment | null = null;

  for (let index = 0; index < words.length; index += 1) {
    const start = starts[index] ?? 0;
    const end = ends[index] ?? start;
    const word = words[index]?.trim();
    if (!word) continue;

    if (!current || start - current.start >= 4) {
      if (current) segments.push(current);
      current = { start, end, text: word };
    } else {
      current.end = end;
      current.text += ` ${word}`;
    }
  }

  if (current) segments.push(current);
  return segments;
}

export async function transcribeAudio(
  audioPath: string,
  durationSeconds: number,
): Promise<SarvamTranscription> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new ServiceError(
      500,
      "SARVAM_API_KEY is required to transcribe reel audio.",
    );
  }

  const audio = await readFile(audioPath);
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/wav" }), "audio.wav");
  form.append("model", "saaras:v3");
  form.append("with_timestamps", "true");
  form.append("language_code", "en-IN");

  const baseUrl = (process.env.SARVAM_BASE_URL ?? "https://api.sarvam.ai").replace(
    /\/$/,
    "",
  );
  const response = await fetch(`${baseUrl}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new ServiceError(
      502,
      `Sarvam transcription failed (${response.status}): ${detail}`,
    );
  }

  const payload = (await response.json()) as SarvamResponse;
  const transcript = (payload.transcript ?? payload.text ?? "").trim();
  const segments: TranscriptSegment[] = [];

  for (const chunk of payload.chunks ?? []) {
    const start = chunk.start ?? chunk.start_time ?? chunk.start_time_seconds ?? 0;
    const end = chunk.end ?? chunk.end_time ?? chunk.end_time_seconds ?? start;
    const text = chunk.text?.trim();
    if (text) segments.push({ start, end, text });
  }

  if (segments.length === 0 && payload.timestamps?.words) {
    segments.push(
      ...groupWords(
        payload.timestamps.words,
        payload.timestamps.start_time_seconds ?? [],
        payload.timestamps.end_time_seconds ?? [],
      ),
    );
  }

  if (segments.length === 0 && transcript) {
    segments.push({ start: 0, end: durationSeconds, text: transcript });
  }

  return {
    transcript: transcript || segments.map((segment) => segment.text).join(" "),
    segments,
  };
}
