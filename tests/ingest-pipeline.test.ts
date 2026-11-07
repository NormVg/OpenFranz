import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeIngestPath,
  selectFrameTimes,
} from "../shared/utils/ingest-pipeline.ts";

test("selects speech-timed frames across the whole reel", () => {
  const segments = Array.from({ length: 20 }, (_, index) => ({
    start: index * 3,
    end: index * 3 + 2,
    text: `Segment ${index}`,
  }));

  const times = selectFrameTimes(segments, 60, 5);

  assert.equal(times.length, 5);
  assert.equal(times[0], 1);
  assert.equal(times.at(-1), 49);
  assert.deepEqual(times, [...times].sort((left, right) => left - right));
});

test("falls back to uniform frames when there is no transcript", () => {
  const times = selectFrameTimes([], 40, 8);

  assert.equal(times.length, 8);
  assert.equal(times[0], 4.44);
  assert.equal(times.at(-1), 35.56);
});

test("accepts only markdown documents under arsenal or knowledge", () => {
  assert.equal(isSafeIngestPath("/arsenal/hooks.md"), true);
  assert.equal(isSafeIngestPath("/knowledge/psychology.md"), true);
  assert.equal(isSafeIngestPath("/tecniques/hooks.md"), false);
  assert.equal(isSafeIngestPath("/arsenal/hooks.txt"), false);
  assert.equal(isSafeIngestPath("/etc/passwd"), false);
});
