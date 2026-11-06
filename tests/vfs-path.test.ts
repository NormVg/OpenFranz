import assert from "node:assert/strict";
import test from "node:test";
import {
  isVfsRoot,
  joinVfsPath,
  normalizeVfsPath,
  parentVfsPath,
  vfsBasename,
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

test("rejects null bytes and overlong paths", () => {
  assert.throws(() => normalizeVfsPath("/a\0b"), /null bytes/);
  assert.throws(() => normalizeVfsPath(`/${"a".repeat(1024)}`), /1024/);
});
