import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  buildFrameCommand,
  extractFrames,
  runFfmpegCommand,
} from "../server/services/rendi.service.ts";
import { ServiceError } from "../server/utils/service-error.ts";

const originalFetch = globalThis.fetch;
let calls: Array<{ url: string; init?: RequestInit }> = [];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env.RENDI_API_KEY = "test-key";
  process.env.RENDI_POLL_INTERVAL_MS = "0";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.RENDI_POLL_INTERVAL_MS;
});

test("builds a single-frame command with input seeking", () => {
  const { command, outputFiles } = buildFrameCommand([1.5]);

  assert.equal(
    command,
    "-ss 1.5 -i {{in_1}} -frames:v 1 -vf scale=768:-1 {{out_1}}",
  );
  assert.deepEqual(outputFiles, { out_1: "frame_1.jpg" });
});

test("builds one split graph for multiple frames", () => {
  const { command, outputFiles } = buildFrameCommand([0.5, 4.2, 9.9]);

  assert.match(command, /split=3\[v0\]\[v1\]\[v2\]/);
  assert.match(command, /\[v0\]select='gte\(t,0\.5\)',scale=768:-1\[f0\]/);
  assert.match(command, /\[v2\]select='gte\(t,9\.9\)',scale=768:-1\[f2\]/);
  assert.match(command, /-map \[f0\] -frames:v 1 \{\{out_1\}\}/);
  assert.deepEqual(outputFiles, {
    out_1: "frame_1.jpg",
    out_2: "frame_2.jpg",
    out_3: "frame_3.jpg",
  });
});

test("deduplicates timestamps and clamps negatives", () => {
  const { outputFiles } = buildFrameCommand([-2, 0, 0, 3]);

  assert.deepEqual(Object.keys(outputFiles), ["out_1", "out_2"]);
});

test("rejects an empty frame plan", () => {
  assert.throws(() => buildFrameCommand([]), ServiceError);
});

test("polls a command until it succeeds", async () => {
  let polls = 0;

  mockFetch((url) => {
    if (url.endsWith("/run-ffmpeg-command")) {
      return jsonResponse({ command_id: "cmd-1" });
    }

    polls += 1;
    if (polls === 1) {
      return jsonResponse({ command_id: "cmd-1", status: "PROCESSING" });
    }

    return jsonResponse({
      command_id: "cmd-1",
      status: "SUCCESS",
      output_files: {
        out_1: {
          file_id: "f1",
          storage_url: "https://cdn/frame.jpg",
          status: "STORED",
        },
      },
    });
  });

  const outputs = await runFfmpegCommand({
    inputFiles: { in_1: "https://cdn/video.mp4" },
    outputFiles: { out_1: "frame.jpg" },
    command: "-i {{in_1}} {{out_1}}",
  });

  assert.equal(outputs.out_1?.storage_url, "https://cdn/frame.jpg");
  assert.equal(calls.length, 3);

  const submit = calls[0]?.init?.body;
  assert.equal(typeof submit, "string");
  assert.match(
    String(submit),
    /"ffmpeg_command":"-i \{\{in_1\}\} \{\{out_1\}\}"/,
  );
});

test("surfaces the Rendi failure message", async () => {
  mockFetch((url) =>
    url.endsWith("/run-ffmpeg-command")
      ? jsonResponse({ command_id: "cmd-2" })
      : jsonResponse({
          command_id: "cmd-2",
          status: "FAILED",
          error: "bad filter",
        }),
  );

  await assert.rejects(
    () =>
      runFfmpegCommand({
        inputFiles: { in_1: "https://cdn/video.mp4" },
        outputFiles: { out_1: "frame.jpg" },
        command: "-i {{in_1}} {{out_1}}",
      }),
    (error: unknown) =>
      error instanceof ServiceError && /bad filter/.test(error.message),
  );
});

test("requires an API key", async () => {
  delete process.env.RENDI_API_KEY;

  await assert.rejects(
    () => extractFrames("https://cdn/video.mp4", [1]),
    (error: unknown) =>
      error instanceof ServiceError && /RENDI_API_KEY/.test(error.message),
  );
});
