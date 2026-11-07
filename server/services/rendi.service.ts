import { ServiceError } from "../utils/service-error";

const DEFAULT_BASE_URL = "https://api.rendi.dev/v1";
const POLL_INTERVAL_MS = 2_000;
const COMMAND_TIMEOUT_MS = 300_000;
const FRAME_WIDTH = 768;

export type RendiOutputFile = {
  file_id: string;
  storage_url: string;
  status: string;
  file_type?: string;
  file_format?: string;
  width?: number;
  height?: number;
  size_mbytes?: number;
};

type RendiCommandStatus = "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED";

type RendiCommandResponse = {
  command_id: string;
  status: RendiCommandStatus;
  output_files?: Record<string, RendiOutputFile>;
  error?: string | { message?: string };
  error_message?: string;
};

type RunFfmpegCommandOptions = {
  inputFiles: Record<string, string>;
  outputFiles: Record<string, string>;
  command: string;
  maxSeconds?: number;
  vcpuCount?: number;
};

function baseUrl(): string {
  return (process.env.RENDI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.RENDI_API_KEY;
  if (!key) {
    throw new ServiceError(
      500,
      "RENDI_API_KEY is required to process Instagram media.",
    );
  }
  return key;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "X-API-KEY": apiKey(),
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new ServiceError(
      502,
      `Rendi request failed (${response.status}): ${detail}`,
    );
  }

  return (await response.json()) as T;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function pollIntervalMs(): number {
  const configured = Number(process.env.RENDI_POLL_INTERVAL_MS ?? POLL_INTERVAL_MS);
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : POLL_INTERVAL_MS;
}

function commandError(payload: RendiCommandResponse): string {
  if (typeof payload.error === "string") return payload.error;
  if (
    payload.error &&
    typeof payload.error === "object" &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return payload.error_message ?? "unknown error";
}

/**
 * Builds the FFmpeg command that captures one frame at each timestamp. A single
 * timestamp uses input seeking; multiple timestamps share one decode through a
 * split/select filter graph, which is Rendi's documented multi-thumbnail shape.
 */
export function buildFrameCommand(times: number[]): {
  command: string;
  outputFiles: Record<string, string>;
} {
  const unique = [...new Set(times.map((time) => Math.max(time, 0)))];

  if (unique.length === 0) {
    throw new ServiceError(400, "At least one frame timestamp is required.");
  }

  const outputFiles: Record<string, string> = {};
  for (let index = 0; index < unique.length; index += 1) {
    outputFiles[`out_${index + 1}`] = `frame_${index + 1}.jpg`;
  }

  if (unique.length === 1) {
    return {
      command: `-ss ${unique[0]} -i {{in_1}} -frames:v 1 -vf scale=${FRAME_WIDTH}:-1 {{out_1}}`,
      outputFiles,
    };
  }

  const splitOutputs = unique.map((_, index) => `[v${index}]`).join("");
  const branches = unique
    .map(
      (time, index) =>
        `[v${index}]select='gte(t,${time})',scale=${FRAME_WIDTH}:-1[f${index}]`,
    )
    .join(";");
  const maps = unique
    .map((_, index) => `-map [f${index}] -frames:v 1 {{out_${index + 1}}}`)
    .join(" ");

  return {
    command: `-i {{in_1}} -filter_complex "[0:v]split=${unique.length}${splitOutputs};${branches}" ${maps}`,
    outputFiles,
  };
}

export async function runFfmpegCommand(
  options: RunFfmpegCommandOptions,
): Promise<Record<string, RendiOutputFile>> {
  const submit = await request<{ command_id: string }>("/run-ffmpeg-command", {
    method: "POST",
    body: JSON.stringify({
      input_files: options.inputFiles,
      output_files: options.outputFiles,
      ffmpeg_command: options.command,
      ...(options.maxSeconds
        ? { max_command_run_seconds: options.maxSeconds }
        : {}),
      ...(options.vcpuCount ? { vcpu_count: options.vcpuCount } : {}),
    }),
  });

  const deadline = Date.now() + COMMAND_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await request<RendiCommandResponse>(
      `/commands/${submit.command_id}`,
    );

    if (status.status === "SUCCESS") {
      if (!status.output_files) {
        throw new ServiceError(502, "Rendi returned no output files.");
      }
      return status.output_files;
    }

    if (status.status === "FAILED") {
      throw new ServiceError(
        502,
        `Rendi command failed: ${commandError(status)}`,
      );
    }

    await sleep(pollIntervalMs());
  }

  throw new ServiceError(504, "Rendi command timed out.");
}

export async function extractAudio(fileUrl: string): Promise<string> {
  const outputs = await runFfmpegCommand({
    inputFiles: { in_1: fileUrl },
    outputFiles: { out_1: "audio.wav" },
    command: "-i {{in_1}} -vn -ac 1 -ar 16000 -f wav {{out_1}}",
    maxSeconds: 60,
  });

  const audio = outputs.out_1;
  if (!audio?.storage_url) {
    throw new ServiceError(502, "Rendi did not return the extracted audio.");
  }

  return audio.storage_url;
}

export async function extractFrames(
  fileUrl: string,
  times: number[],
): Promise<string[]> {
  const { command, outputFiles } = buildFrameCommand(times);

  const outputs = await runFfmpegCommand({
    inputFiles: { in_1: fileUrl },
    outputFiles,
    command,
    maxSeconds: 60,
  });

  return Object.keys(outputFiles).map((key) => {
    const file = outputs[key];
    if (!file?.storage_url) {
      throw new ServiceError(502, `Rendi did not return ${key}.`);
    }
    return file.storage_url;
  });
}
