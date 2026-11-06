import assert from "node:assert/strict";
import test from "node:test";
import {
  createBrandSchema,
  updateBrandSchema,
} from "../shared/schemas/brand.ts";
import { createBrandSlug, uniqueBrandSlug } from "../shared/utils/brand.ts";

test("creates readable slugs from brand names", () => {
  assert.equal(createBrandSlug("Acme Coffee Co."), "acme-coffee-co");
  assert.equal(createBrandSlug("Café Déjà"), "cafe-deja");
  assert.equal(createBrandSlug("  ***  "), "brand");
  assert.equal(createBrandSlug("A".repeat(200)).length, 80);
});

test("makes slugs unique with numeric suffixes", () => {
  assert.equal(uniqueBrandSlug("acme", []), "acme");
  assert.equal(uniqueBrandSlug("acme", ["acme"]), "acme-2");
  assert.equal(uniqueBrandSlug("acme", ["acme", "acme-2"]), "acme-3");
});

test("accepts a brand with defaults", () => {
  const parsed = createBrandSchema.parse({ name: "Acme" });

  assert.equal(parsed.name, "Acme");
  assert.equal(parsed.summary, "");
  assert.deepEqual(parsed.products, []);
  assert.equal(parsed.notes, "");
});

test("accepts products with features and pricing", () => {
  const parsed = createBrandSchema.parse({
    name: "Acme",
    products: [
      {
        name: "Acme One",
        description: "A flagship product.",
        features: ["Fast", "Small"],
        pricing: "$99",
      },
    ],
  });

  assert.equal(parsed.products.length, 1);
  assert.deepEqual(parsed.products[0]?.features, ["Fast", "Small"]);
});

test("rejects invalid brand input", () => {
  assert.equal(createBrandSchema.safeParse({ name: "" }).success, false);
  assert.equal(
    createBrandSchema.safeParse({ name: "A".repeat(121) }).success,
    false,
  );
  assert.equal(
    createBrandSchema.safeParse({
      name: "Acme",
      products: Array.from({ length: 21 }, (_, index) => ({
        name: `Product ${index}`,
      })),
    }).success,
    false,
  );
});

test("accepts partial brand updates", () => {
  const parsed = updateBrandSchema.parse({ summary: "Updated summary." });
  assert.equal(parsed.summary, "Updated summary.");
  assert.equal(parsed.name, undefined);
});
