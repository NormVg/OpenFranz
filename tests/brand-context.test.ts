import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBrandContext,
  withBrandContext,
} from "../shared/utils/brand-context.ts";

test("prefixes a message with the brand marker", () => {
  assert.equal(
    withBrandContext("Write a launch post.", {
      slug: "acme-coffee",
      name: "Acme Coffee",
    }),
    "[[brand:acme-coffee|Acme Coffee]] Write a launch post.",
  );
});

test("keeps the marker when the message is empty", () => {
  assert.equal(
    withBrandContext("", { slug: "acme", name: "Acme" }),
    "[[brand:acme|Acme]]",
  );
});

test("parses the brand marker and the remaining text", () => {
  assert.deepEqual(
    parseBrandContext("[[brand:acme-coffee|Acme Coffee]] Write a post."),
    {
      slug: "acme-coffee",
      name: "Acme Coffee",
      product: null,
      text: "Write a post.",
    },
  );
});

test("leaves messages without a marker untouched", () => {
  assert.deepEqual(parseBrandContext("Just a message."), {
    slug: null,
    name: null,
    product: null,
    text: "Just a message.",
  });
});

test("round-trips a message through the marker", () => {
  const original = "Draft three product taglines.";
  const marked = withBrandContext(original, {
    slug: "acme",
    name: "Acme",
  });

  assert.deepEqual(parseBrandContext(marked), {
    slug: "acme",
    name: "Acme",
    product: null,
    text: original,
  });
});

test("sanitizes marker characters in brand names", () => {
  assert.equal(
    withBrandContext("Hi", { slug: "acme", name: "Acme | Co]" }),
    "[[brand:acme|Acme  Co]] Hi",
  );
});

test("adds the chosen product to the marker", () => {
  assert.equal(
    withBrandContext("Write a launch post.", {
      slug: "acme-coffee",
      name: "Acme Coffee",
      product: "Cold Brew",
    }),
    "[[brand:acme-coffee|Acme Coffee|Cold Brew]] Write a launch post.",
  );
});

test("parses the chosen product from the marker", () => {
  assert.deepEqual(
    parseBrandContext(
      "[[brand:acme-coffee|Acme Coffee|Cold Brew]] Write a post.",
    ),
    {
      slug: "acme-coffee",
      name: "Acme Coffee",
      product: "Cold Brew",
      text: "Write a post.",
    },
  );
});

test("round-trips a product through the marker", () => {
  const original = "Draft three product taglines.";
  const marked = withBrandContext(original, {
    slug: "acme",
    name: "Acme",
    product: "Cold Brew",
  });

  assert.deepEqual(parseBrandContext(marked), {
    slug: "acme",
    name: "Acme",
    product: "Cold Brew",
    text: original,
  });
});

test("sanitizes marker characters in product names", () => {
  assert.equal(
    withBrandContext("Hi", {
      slug: "acme",
      name: "Acme",
      product: "Cold | Brew]",
    }),
    "[[brand:acme|Acme|Cold  Brew]] Hi",
  );
});
