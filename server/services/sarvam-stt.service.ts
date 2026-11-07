import type { TranscriptSegment } from "../../shared/types/ingest-pipeline";
import { ServiceError } from "../utils/service-error";

const REST_LIMIT_SECONDS = 30;

type SarvamTimestamps = {
  words?: string[];
  chunks?: string[];
  start_time_seconds?: number[];
  end_time_seconds?: number[];
};

type SarvamResponse = {
  transcript?: string;
  text?: string;
  timestamps?: SarvamTimestamps;
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

type BatchInitResponse = {
  job_id: string;
};

type BatchUploadResponse = {
  upload_urls: Record<string, { file_url: string }>;
};

type BatchStatusResponse = {
  job_state: string;
  error_message?: string;
  job_details?: Array<{
    outputs?: Array<{ file_name: string }>;
    error_message?: string | null;
  }>;
};

type BatchDownloadResponse = {
  download_urls: Record<string, { file_url: string }>;
};

export type SarvamTranscription = {
  transcript: string;
  segments: TranscriptSegment[];
};

function baseUrl(): string {
  return (process.env.SARVAM_BASE_URL ?? "https://api.sarvam.ai").replace(
    /\/$/,
    "",
  );
}

function apiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) {
    throw new ServiceError(
      500,
      "SARVAM_API_KEY is required to transcribe reel audio.",
    );
  }
  return key;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "api-subscription-key": apiKey(),
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new ServiceError(
      502,
      `Sarvam request failed (${response.status}): ${detail}`,
    );
  }

  return (await response.json()) as T;
}

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

function parsePayload(
  payload: SarvamResponse,
  offsetSeconds: number,
  durationSeconds: number,
): SarvamTranscription {
  const transcript = (payload.transcript ?? payload.text ?? "").trim();
  const segments: TranscriptSegment[] = [];
  const timestamps = payload.timestamps;

  if (timestamps?.chunks && timestamps.start_time_seconds) {
    for (let index = 0; index < timestamps.chunks.length; index += 1) {
      const text = timestamps.chunks[index]?.trim();
      if (!text) continue;
      const start = timestamps.start_time_seconds[index] ?? 0;
      const end = timestamps.end_time_seconds?.[index] ?? start;
      segments.push({
        start: start + offsetSeconds,
        end: end + offsetSeconds,
        text,
      });
    }
  }

  for (const chunk of payload.chunks ?? []) {
    const start = chunk.start ?? chunk.start_time ?? chunk.start_time_seconds ?? 0;
    const end = chunk.end ?? chunk.end_time ?? chunk.end_time_seconds ?? start;
    const text = chunk.text?.trim();
    if (text) {
      segments.push({
        start: start + offsetSeconds,
        end: end + offsetSeconds,
        text,
      });
    }
  }

  if (segments.length === 0 && timestamps?.words) {
    const grouped = groupWords(
      timestamps.words,
      timestamps.start_time_seconds ?? [],
      timestamps.end_time_seconds ?? [],
    );
    segments.push(
      ...grouped.map((segment) => ({
        start: segment.start + offsetSeconds,
        end: segment.end + offsetSeconds,
        text: segment.text,
      })),
    );
  }

  if (segments.length === 0 && transcript) {
    segments.push({
      start: offsetSeconds,
      end: offsetSeconds + durationSeconds,
      text: transcript,
    });
  }

  return {
    transcript: transcript || segments.map((segment) => segment.text).join(" "),
    segments,
  };
}

async function transcribeRest(
  audio: ArrayBuffer,
  durationSeconds: number,
): Promise<SarvamTranscription> {
  const form = new FormData();
  form.append("file", new Blob([audio], { type: "audio/wav" }), "audio.wav");
  form.append("model", "saaras:v3");
  form.append("with_timestamps", "true");
  form.append("language_code", "en-IN");

  const payload = await request<SarvamResponse>("/speech-to-text", {
    method: "POST",
    body: form,
  });

  return parsePayload(payload, 0, durationSeconds);
}

async function transcribeBatch(
  audio: ArrayBuffer,
  durationSeconds: number,
): Promise<SarvamTranscription> {
  const init = await request<BatchInitResponse>("/speech-to-text/job/v1", {
    method: "POST",
    body: JSON.stringify({
      job_parameters: {
        model: "saaras:v3",
        mode: "transcribe",
        language_code: "en-IN",
        with_timestamps: true,
      },
    }),
  });

  const upload = await request<BatchUploadResponse>(
    "/speech-to-text/job/v1/upload-files",
    {
      method: "POST",
      body: JSON.stringify({ job_id: init.job_id, files: ["audio.wav"] }),
    },
  );

  const uploadUrl = upload.upload_urls["audio.wav"]?.file_url;
  if (!uploadUrl) {
    throw new ServiceError(502, "Sarvam did not return an upload URL.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: audio,
    headers: {
      "Content-Type": "audio/wav",
      "x-ms-blob-type": "BlockBlob",
    },
    signal: AbortSignal.timeout(180_000),
  });
  if (!uploadResponse.ok) {
    throw new ServiceError(
      502,
      `Sarvam audio upload failed (${uploadResponse.status}).`,
    );
  }

  await request(`/speech-to-text/job/v1/${init.job_id}/start`, {
    method: "POST",
  });

  let status: BatchStatusResponse | null = null;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    status = await request<BatchStatusResponse>(
      `/speech-to-text/job/v1/${init.job_id}/status`,
    );
    if (status.job_state === "Completed") break;
    if (status.job_state === "Failed") {
      throw new ServiceError(
        502,
        status.error_message || "Sarvam batch transcription failed.",
      );
    }
  }

  if (!status || status.job_state !== "Completed") {
    throw new ServiceError(504, "Sarvam batch transcription timed out.");
  }

  const outputs = (status.job_details ?? []).flatMap(
    (detail) => detail.outputs ?? [],
  );
  if (outputs.length === 0) {
    throw new ServiceError(502, "Sarvam batch job returned no output files.");
  }

  const download = await request<BatchDownloadResponse>(
    "/speech-to-text/job/v1/download-files",
    {
      method: "POST",
      body: JSON.stringify({
        job_id: init.job_id,
        files: outputs.map((output) => output.file_name),
      }),
    },
  );

  const transcripts: string[] = [];
  const segments: TranscriptSegment[] = [];

  for (const output of outputs) {
    const url = download.download_urls[output.file_name]?.file_url;
    if (!url) continue;
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) continue;
    const payload = (await response.json()) as SarvamResponse;
    const parsed = parsePayload(payload, 0, durationSeconds);
    if (parsed.transcript) transcripts.push(parsed.transcript);
    segments.push(...parsed.segments);
  }

  return {
    transcript: transcripts.join(" ").trim(),
    segments,
  };
}

export async function transcribeAudio(
  audio: ArrayBuffer,
  durationSeconds: number,
): Promise<SarvamTranscription> {
  if (durationSeconds <= REST_LIMIT_SECONDS) {
    return transcribeRest(audio, durationSeconds);
  }

  return transcribeBatch(audio, durationSeconds);
}
