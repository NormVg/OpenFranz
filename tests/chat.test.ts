import assert from "node:assert/strict";
import test from "node:test";
import { appendTranscript, createTitle } from "../shared/utils/chat.ts";
import {
  chatIdSchema,
  chatTitleSchema,
  createChatSchema,
  updateChatSchema,
} from "../shared/schemas/chat.ts";

test("createTitle normalizes whitespace and strips markdown punctuation", () => {
  assert.equal(createTitle("  ## Build   the *thing*  "), "Build the thing");
});

test("createTitle truncates long prompts to the title limit", () => {
  const title = createTitle("a".repeat(100));
  assert.equal(title.length, 72);
  assert.ok(title.endsWith("..."));
});

test("createTitle falls back for empty input", () => {
  assert.equal(createTitle("   "), "New chat");
});

test("chat titles reject empty and overlong values", () => {
  assert.equal(chatTitleSchema.safeParse("").success, false);
  assert.equal(chatTitleSchema.safeParse("a".repeat(73)).success, false);
  assert.equal(chatTitleSchema.safeParse("Valid title").success, true);
});

test("create chat applies the default title", () => {
  assert.deepEqual(createChatSchema.parse({}), { title: "New chat" });
});

test("chat updates require at least one field", () => {
  assert.equal(updateChatSchema.safeParse({}).success, false);
  assert.equal(updateChatSchema.safeParse({ title: "Renamed" }).success, true);
});

test("chat ids must be UUIDs", () => {
  assert.equal(chatIdSchema.safeParse("not-an-id").success, false);
  assert.equal(
    chatIdSchema.safeParse("6f1c5e4e-7f0a-4c0f-9c4b-2f0f6c3c4a11").success,
    true,
  );
});

test("appendTranscript adds a new recording after the existing draft", () => {
  assert.equal(
    appendTranscript("Write a reel intro.", "Make it thirty seconds."),
    "Write a reel intro. Make it thirty seconds.",
  );
});

test("appendTranscript keeps the draft when the transcript is empty", () => {
  assert.equal(appendTranscript("Keep this.", "   "), "Keep this.");
});

test("appendTranscript returns the transcript when the draft is empty", () => {
  assert.equal(appendTranscript("   ", "  Start here.  "), "Start here.");
});

test("appendTranscript does not rewrite earlier recordings", () => {
  const first = appendTranscript("", "First thought.");
  const second = appendTranscript(first, "Second thought.");
  assert.equal(second, "First thought. Second thought.");
});
