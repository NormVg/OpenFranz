import assert from "node:assert/strict";
import test from "node:test";
import {
  createStrategySchema,
  strategyIdSchema,
  strategyTitleSchema,
  updateStrategySchema,
} from "../shared/schemas/strategy.ts";

test("strategy titles trim and enforce bounds", () => {
  const trimmed = strategyTitleSchema.safeParse("  Launch-month cadence  ");
  assert.equal(trimmed.success, true);
  assert.equal(trimmed.success && trimmed.data, "Launch-month cadence");
  assert.equal(strategyTitleSchema.safeParse("   ").success, false);
  assert.equal(strategyTitleSchema.safeParse("").success, false);
  assert.equal(strategyTitleSchema.safeParse("a".repeat(121)).success, false);
  assert.equal(strategyTitleSchema.safeParse("a".repeat(120)).success, true);
});

test("strategy content is required and bounded", () => {
  assert.equal(
    createStrategySchema.safeParse({ title: "T", content: " " }).success,
    false,
  );
  assert.equal(
    createStrategySchema.safeParse({ title: "T", content: "" }).success,
    false,
  );
  assert.equal(
    createStrategySchema.safeParse({
      title: "T",
      content: "a".repeat(20_001),
    }).success,
    false,
  );
  assert.equal(
    createStrategySchema.safeParse({
      title: "T",
      content: "a".repeat(20_000),
    }).success,
    true,
  );
});

test("a new strategy leaves activation to the service", () => {
  const parsed = createStrategySchema.parse({
    title: "Weekly cadence",
    content: "Post twice a week.",
  });
  assert.equal(parsed.isActive, undefined);
});

test("an explicit activation survives validation", () => {
  const parsed = createStrategySchema.parse({
    title: "Weekly cadence",
    content: "Post twice a week.",
    isActive: true,
  });
  assert.equal(parsed.isActive, true);
});

test("updates accept only the changed fields", () => {
  const parsed = updateStrategySchema.parse({ isActive: true });
  assert.equal(parsed.isActive, true);
  assert.equal("title" in parsed, false);
  assert.equal("content" in parsed, false);
});

test("an update may not be empty", () => {
  assert.equal(updateStrategySchema.safeParse({}).success, false);
});

test("strategy ids must be uuids", () => {
  assert.equal(
    strategyIdSchema.safeParse("f388e301-b824-484f-be5b-4a2220479417")
      .success,
    true,
  );
  assert.equal(strategyIdSchema.safeParse("not-a-uuid").success, false);
});
