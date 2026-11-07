import assert from "node:assert/strict";
import test from "node:test";
import {
  frameTarget,
  isSafeIngestPath,
  selectFrameTimes,
  validateIngestDocument,
  wavDurationSeconds,
} from "../shared/utils/ingest-pipeline.ts";

test("selects speech-timed frames across the whole reel", () => {
  const segments = Array.from({ length: 20 }, (_, index) => ({
    start: index * 3,
    end: index * 3 + 2,
    text: `Segment ${index}`,
  }));

  const times = selectFrameTimes(segments, 60, 5);

  assert.deepEqual(times, [7, 19, 31, 43, 55]);
});

test("falls back to uniform frames when there is no transcript", () => {
  const times = selectFrameTimes([], 40, 8);

  assert.deepEqual(times, [2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5, 37.5]);
});

test("adds uniform frames when transcript chunks are too coarse", () => {
  const times = selectFrameTimes(
    [
      { start: 0, end: 30, text: "First half" },
      { start: 30, end: 47, text: "Second half" },
    ],
    47,
    12,
  );

  assert.equal(times.length, 12);
  assert.equal(times[0]! < 5, true);
  assert.equal(times.at(-1)! > 40, true);
  assert.equal(times.includes(15), true);
  assert.deepEqual(times, [...times].sort((left, right) => left - right));
});

test("prefers visual scene cuts inside each slot", () => {
  const times = selectFrameTimes([], 40, 8, [5, 20, 35]);

  assert.equal(times.length, 8);
  assert.equal(times.includes(5), true);
  assert.equal(times.includes(20), true);
  assert.equal(times.includes(35), true);
  assert.deepEqual(times, [...times].sort((left, right) => left - right));
});

test("scales frame count with reel length up to the cap", () => {
  assert.equal(frameTarget(10, 24), 6);
  assert.equal(frameTarget(23.5, 24), 12);
  assert.equal(frameTarget(47, 24), 24);
  assert.equal(frameTarget(60, 24), 24);
  assert.equal(frameTarget(120, 24), 24);
  assert.equal(frameTarget(60, 5), 5);
});

test("accepts only markdown documents under arsenal or knowledge", () => {
  assert.equal(isSafeIngestPath("/arsenal/hooks.md"), true);
  assert.equal(isSafeIngestPath("/knowledge/psychology.md"), true);
  assert.equal(isSafeIngestPath("/tecniques/hooks.md"), false);
  assert.equal(isSafeIngestPath("/arsenal/hooks.txt"), false);
  assert.equal(isSafeIngestPath("/etc/passwd"), false);
});

const sourceUrl = "https://www.instagram.com/p/abc/";

const groundedDocument = `# Result First Hook

Source: ${sourceUrl}

## What the source shows

- The creator opens on the finished result, then cuts back to the failed attempt.
- The on-screen text reads "I tried this for 30 days".
- The spoken line is "Here is what nobody tells you about the first attempt".

## Apply it

- Open on the finished result for the first second, then rewind to the failed attempt so the viewer has a reason to stay for the explanation.

## Related

- [Hook Alignment Framework](/arsenal/hooks-attention/Hook-Alignment-Framework.md)
`;

test("accepts a grounded document with a source and sections", () => {
  assert.deepEqual(validateIngestDocument(groundedDocument, sourceUrl), []);
});

test("rejects thin, unsourced, and placeholder documents", () => {
  const thin = `# Too short\n\nSource: ${sourceUrl}`;
  assert.equal(validateIngestDocument(thin, sourceUrl).length > 0, true);

  const wrongSource = groundedDocument.replace(sourceUrl, "https://example.com");
  assert.equal(validateIngestDocument(wrongSource, sourceUrl).length > 0, true);

  const noSections = `# Title\n\nSource: ${sourceUrl}\n\n${"A".repeat(320)}`;
  assert.equal(validateIngestDocument(noSections, sourceUrl).length > 0, true);

  const placeholder = `${groundedDocument}\n\nSee the Visual Awe Checklist (to be created).`;
  assert.equal(validateIngestDocument(placeholder, sourceUrl).length > 0, true);

  const tooLong = `${groundedDocument}\n\n${"A".repeat(6_000)}`;
  assert.equal(validateIngestDocument(tooLong, sourceUrl).length > 0, true);
});

test("derives reel duration from the extracted WAV byte length", () => {
  assert.equal(wavDurationSeconds(new ArrayBuffer(44 + 32_000)), 1);
  assert.equal(wavDurationSeconds(new ArrayBuffer(44 + 96_000)), 3);
});

test("never returns a negative duration for a short WAV", () => {
  assert.equal(wavDurationSeconds(new ArrayBuffer(0)), 0);
  assert.equal(wavDurationSeconds(new ArrayBuffer(20)), 0);
});
