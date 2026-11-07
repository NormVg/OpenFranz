import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedRootDirectory,
  isVfsRoot,
  joinVfsPath,
  normalizeVfsPath,
  parentVfsPath,
  vfsBasename,
  violatesRootPolicy,
} from "../shared/utils/vfs-path.ts";

test("normalizes relative and repeated separators", () => {
  assert.equal(normalizeVfsPath("a//b/"), "/a/b");
  assert.equal(normalizeVfsPath("\\a\\b"), "/a/b");
  assert.equal(normalizeVfsPath(""), "/");
});

test("resolves dot segments without escaping the root", () => {
  assert.equal(normalizeVfsPath("/a/./b"), "/a/b");
  assert.equal(normalizeVfsPath("/a/../b"), "/b");
  assert.equal(normalizeVfsPath("/../../b"), "/b");
});

test("derives parent paths and basenames", () => {
  assert.equal(parentVfsPath("/a/b"), "/a");
  assert.equal(parentVfsPath("/a"), "/");
  assert.equal(parentVfsPath("/"), "/");
  assert.equal(vfsBasename("/a/b"), "b");
  assert.equal(vfsBasename("/"), "/");
});

test("joins paths safely", () => {
  assert.equal(joinVfsPath("/a", "b/c"), "/a/b/c");
  assert.equal(joinVfsPath("/", "x"), "/x");
  assert.equal(joinVfsPath("/a", "../b"), "/b");
});

test("recognizes the root path", () => {
  assert.equal(isVfsRoot("/"), true);
  assert.equal(isVfsRoot("/a"), false);
});

test("allows only arsenal and knowledge as root folders", () => {
  assert.equal(isAllowedRootDirectory("arsenal"), true);
  assert.equal(isAllowedRootDirectory("knowledge"), true);
  assert.equal(isAllowedRootDirectory("tecniques"), false);
  assert.equal(isAllowedRootDirectory("notes"), false);
});

test("rejects every root entry except the two allowed folders", () => {
  assert.equal(violatesRootPolicy("/", "directory"), false);
  assert.equal(violatesRootPolicy("/arsenal", "directory"), false);
  assert.equal(violatesRootPolicy("/knowledge", "directory"), false);

  assert.equal(violatesRootPolicy("/notes", "directory"), true);
  assert.equal(violatesRootPolicy("/tecniques", "directory"), true);
  assert.equal(violatesRootPolicy("/notes.md", "file"), true);
  assert.equal(violatesRootPolicy("/arsenal", "file"), true);
  assert.equal(violatesRootPolicy("/knowledge", "file"), true);
});

test("allows any entry below the first level", () => {
  assert.equal(violatesRootPolicy("/arsenal/notes.md", "file"), false);
  assert.equal(violatesRootPolicy("/arsenal/deep/notes.md", "file"), false);
  assert.equal(violatesRootPolicy("/knowledge/drafts", "directory"), false);
});

test("rejects null bytes and overlong paths", () => {
  assert.throws(() => normalizeVfsPath("/a\0b"), /null bytes/);
  assert.throws(() => normalizeVfsPath(`/${"a".repeat(1024)}`), /1024/);
});
