import assert from "node:assert/strict";
import test from "node:test";
import {
  extractVfsLinks,
  resolveVfsLink,
} from "../shared/utils/vfs-links.ts";
import {
  fuzzyScore,
  rankVfsPaths,
} from "../shared/utils/vfs-fuzzy.ts";

test("extracts wiki and markdown links", () => {
  const links = extractVfsLinks(`
    See [[notes/architecture]] and [the guide](../guides/setup.md#install).
    Ignore [external](https://example.com) and ![image](./image.png).
  `);

  assert.deepEqual(links, [
    { target: "notes/architecture", kind: "wiki" },
    { target: "../guides/setup.md#install", kind: "markdown" },
  ]);
});

test("resolves relative links against the source file", () => {
  assert.equal(
    resolveVfsLink("/notes/index.md", "../guides/setup.md#install"),
    "/guides/setup.md",
  );
  assert.equal(
    resolveVfsLink("/notes/index.md", "architecture.md"),
    "/notes/architecture.md",
  );
  assert.equal(
    resolveVfsLink("/notes/index.md", "/shared/glossary.md"),
    "/shared/glossary.md",
  );
});

test("ignores external and fragment-only links", () => {
  assert.equal(resolveVfsLink("/notes/index.md", "https://example.com"), null);
  assert.equal(resolveVfsLink("/notes/index.md", "#section"), null);
  assert.equal(resolveVfsLink("/notes/index.md", "mailto:test@example.com"), null);
});

test("fuzzy scoring prefers exact and basename matches", () => {
  assert.ok(fuzzyScore("setup", "/guides/setup.md") > fuzzyScore("setup", "/guides/setup-notes.md"));
  assert.ok(fuzzyScore("setup", "/guides/setup.md") > 0);
  assert.equal(fuzzyScore("zzz", "/guides/setup.md"), 0);
});

test("ranks fuzzy path matches deterministically", () => {
  const matches = rankVfsPaths("archit", [
    "/notes/architecture.md",
    "/notes/archive.md",
    "/guides/setup.md",
  ]);

  assert.equal(matches[0]?.path, "/notes/architecture.md");
  assert.ok(matches.every((match) => match.score > 0));
});
