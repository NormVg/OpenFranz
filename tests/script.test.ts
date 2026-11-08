import assert from "node:assert/strict";
import test from "node:test";
import {
  createScriptSchema,
  saveScriptVersionSchema,
} from "../shared/schemas/script.ts";
import {
  createScriptSlug,
  uniqueScriptSlug,
} from "../shared/utils/script.ts";

test("creates readable slugs from script titles", () => {
  assert.equal(createScriptSlug("Cold Brew Launch Reel"), "cold-brew-launch-reel");
  assert.equal(createScriptSlug("Café Déjà"), "cafe-deja");
  assert.equal(createScriptSlug("  ***  "), "script");
  assert.equal(createScriptSlug("A".repeat(200)).length, 80);
});

test("makes script slugs unique with numeric suffixes", () => {
  assert.equal(uniqueScriptSlug("reel", []), "reel");
  assert.equal(uniqueScriptSlug("reel", ["reel"]), "reel-2");
  assert.equal(uniqueScriptSlug("reel", ["reel", "reel-2"]), "reel-3");
});

test("accepts a script with defaults", () => {
  const parsed = createScriptSchema.parse({
    title: "Launch reel",
    content: "0-2s | on-screen: Pour",
  });

  assert.equal(parsed.title, "Launch reel");
  assert.equal(parsed.brand, "");
  assert.equal(parsed.note, "");
});

test("rejects invalid script input", () => {
  assert.equal(createScriptSchema.safeParse({ title: "", content: "x" }).success, false);
  assert.equal(
    createScriptSchema.safeParse({ title: "A".repeat(201), content: "x" })
      .success,
    false,
  );
  assert.equal(
    createScriptSchema.safeParse({ title: "A", content: "" }).success,
    false,
  );
});

test("a saved version requires content but not a new title", () => {
  const parsed = saveScriptVersionSchema.parse({
    content: "0-2s | on-screen: New take",
  });

  assert.equal(parsed.content, "0-2s | on-screen: New take");
  assert.equal(parsed.title, undefined);
  assert.equal(parsed.note, "");
  assert.equal(saveScriptVersionSchema.safeParse({}).success, false);
});
