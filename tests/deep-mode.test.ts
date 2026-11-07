import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBrandContext,
  withBrandContext,
} from "../shared/utils/brand-context.ts";
import { parseDeepMode, withDeepMode } from "../shared/utils/deep-mode.ts";

test("prefixes a message with the deep marker", () => {
  assert.equal(
    withDeepMode("Write a launch script."),
    "[[deep]] Write a launch script.",
  );
});

test("keeps the marker when the message is empty", () => {
  assert.equal(withDeepMode(""), "[[deep]]");
});

test("parses the deep marker and the remaining text", () => {
  assert.deepEqual(parseDeepMode("[[deep]] Write a launch script."), {
    deep: true,
    text: "Write a launch script.",
  });
});

test("leaves messages without a marker untouched", () => {
  assert.deepEqual(parseDeepMode("Just a message."), {
    deep: false,
    text: "Just a message.",
  });
});

test("round-trips a message through the marker", () => {
  const original = "Draft three product taglines.";
  assert.deepEqual(parseDeepMode(withDeepMode(original)), {
    deep: true,
    text: original,
  });
});

test("composes with the brand marker", () => {
  const marked = withDeepMode(
    withBrandContext("Write a launch post.", {
      slug: "acme-coffee",
      name: "Acme Coffee",
    }),
  );

  assert.equal(
    marked,
    "[[deep]] [[brand:acme-coffee|Acme Coffee]] Write a launch post.",
  );

  const deep = parseDeepMode(marked);
  assert.equal(deep.deep, true);
  assert.deepEqual(parseBrandContext(deep.text), {
    slug: "acme-coffee",
    name: "Acme Coffee",
    text: "Write a launch post.",
  });
});
