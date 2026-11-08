import assert from "node:assert/strict";
import test from "node:test";
import {
  parseScriptContent,
  parseScriptSegments,
} from "../shared/utils/script-block.ts";

test("plain markdown comes back as a single text segment", () => {
  assert.deepEqual(parseScriptSegments("Just a normal reply."), [
    { type: "text", text: "Just a normal reply." },
  ]);
});

test("parses a closed script fence with attributes", () => {
  const source = [
    "Here is the script:",
    '```script title="Cold brew reel" brand="Acme Coffee"',
    "0-2s | on-screen: Pour | spoken: Wait for it",
    "```",
    "Good luck!",
  ].join("\n");

  const segments = parseScriptSegments(source);

  assert.equal(segments.length, 3);
  assert.deepEqual(segments[0], { type: "text", text: "Here is the script:" });
  assert.deepEqual(segments[1], {
    type: "script",
    title: "Cold brew reel",
    brand: "Acme Coffee",
    content: "0-2s | on-screen: Pour | spoken: Wait for it",
    closed: true,
  });
  assert.deepEqual(segments[2], { type: "text", text: "Good luck!" });
});

test("an unterminated fence streams as an open script segment", () => {
  const source = [
    '```script title="Streaming"',
    "0-2s | on-screen: Pour",
  ].join("\n");

  const segments = parseScriptSegments(source);

  assert.equal(segments.length, 1);
  assert.equal(segments[0]?.type, "script");
  if (segments[0]?.type === "script") {
    assert.equal(segments[0].closed, false);
    assert.equal(segments[0].title, "Streaming");
    assert.equal(segments[0].content, "0-2s | on-screen: Pour");
  }
});

test("a fence without attributes yields null metadata", () => {
  const source = '```script\n0-2s | on-screen: Pour\n```';
  const segments = parseScriptSegments(source);

  assert.equal(segments.length, 1);
  if (segments[0]?.type === "script") {
    assert.equal(segments[0].title, null);
    assert.equal(segments[0].brand, null);
  }
});

test("non-script fences stay inside text segments", () => {
  const source = "```ts\nconst x = 1;\n```";
  const segments = parseScriptSegments(source);

  assert.equal(segments.length, 1);
  assert.equal(segments[0]?.type, "text");
});

test("handles multiple script fences with no empty text segments", () => {
  const source = [
    '```script title="One"',
    "body one",
    "```",
    '```script title="Two"',
    "body two",
    "```",
  ].join("\n");

  const segments = parseScriptSegments(source);

  assert.equal(segments.length, 2);
  assert.ok(segments.every((segment) => segment.type === "script"));
});

test("preserves script content verbatim inside the fence", () => {
  const content = ["### Variant A", "", "  indented line", "0-2s | spoken: Hi"];
  const source = ["```script", ...content, "```"].join("\n");

  const segments = parseScriptSegments(source);

  if (segments[0]?.type === "script") {
    assert.equal(segments[0].content, content.join("\n"));
  } else {
    assert.fail("expected a script segment");
  }
});

test("parses beats with labeled segments", () => {
  const blocks = parseScriptContent(
    "0-2s | on-screen: Pour | spoken: Wait for it | visual: Macro steam",
  );

  assert.equal(blocks.length, 1);
  if (blocks[0]?.type === "beats") {
    assert.equal(blocks[0].beats.length, 1);
    const beat = blocks[0].beats[0];
    assert.equal(beat?.time, "0-2s");
    assert.deepEqual(beat?.segments, [
      { label: "on-screen", value: "Pour" },
      { label: "spoken", value: "Wait for it" },
      { label: "visual", value: "Macro steam" },
    ]);
  } else {
    assert.fail("expected a beats block");
  }
});

test("groups consecutive beats and keeps headings apart", () => {
  const blocks = parseScriptContent([
    "### Variant A - contrast open",
    "0-2s | spoken: Opening line",
    "3-5s | spoken: Second line",
    "**Angle:** the contrast",
  ].join("\n"));

  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks[0], {
    type: "heading",
    level: 3,
    text: "Variant A - contrast open",
  });
  if (blocks[1]?.type === "beats") {
    assert.equal(blocks[1].beats.length, 2);
  } else {
    assert.fail("expected a beats block");
  }
  if (blocks[2]?.type === "markdown") {
    assert.equal(blocks[2].text, "**Angle:** the contrast");
  } else {
    assert.fail("expected a markdown block");
  }
});

test("a beat without labels is kept as a raw segment", () => {
  const blocks = parseScriptContent("15s | Just a note here");

  if (blocks[0]?.type === "beats") {
    assert.deepEqual(blocks[0].beats[0]?.segments, [
      { label: null, value: "Just a note here" },
    ]);
  } else {
    assert.fail("expected a beats block");
  }
});

test("content without beats is pure markdown", () => {
  const blocks = parseScriptContent("Just a paragraph.\n\n- a list");

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.type, "markdown");
});

test("empty content yields no blocks", () => {
  assert.deepEqual(parseScriptContent(""), []);
});
