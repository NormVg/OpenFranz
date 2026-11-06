import assert from "node:assert/strict";
import test from "node:test";
import { ingestSchema } from "../shared/schemas/ingest.ts";
import { createIngestSlug, uniqueIngestPath } from "../shared/utils/ingest.ts";

test("creates readable slugs from ingest titles", () => {
  assert.equal(createIngestSlug("Q4 Launch Brief"), "q4-launch-brief");
  assert.equal(createIngestSlug("Café Notes"), "cafe-notes");
  assert.equal(createIngestSlug("***"), "note");
  assert.equal(createIngestSlug("A".repeat(200)).length, 80);
});

test("avoids overwriting existing ingest files", () => {
  assert.equal(uniqueIngestPath("arsenal", "note", []), "/arsenal/note.md");
  assert.equal(
    uniqueIngestPath("arsenal", "note", ["/arsenal/note.md"]),
    "/arsenal/note-2.md",
  );
  assert.equal(
    uniqueIngestPath("arsenal", "note", [
      "/arsenal/note.md",
      "/arsenal/note-2.md",
    ]),
    "/arsenal/note-3.md",
  );
});

test("validates text and url ingest requests", () => {
  assert.equal(
    ingestSchema.safeParse({ kind: "text", title: "Brief", content: "Body" })
      .success,
    true,
  );
  assert.equal(
    ingestSchema.safeParse({ kind: "text", title: "", content: "Body" })
      .success,
    false,
  );
  assert.equal(
    ingestSchema.safeParse({ kind: "url", url: "https://example.com" })
      .success,
    true,
  );
  assert.equal(
    ingestSchema.safeParse({ kind: "url", url: "not-a-url" }).success,
    false,
  );
  assert.equal(
    ingestSchema.safeParse({
      kind: "url",
      url: "https://example.com",
      folder: "other",
    }).success,
    false,
  );
});
