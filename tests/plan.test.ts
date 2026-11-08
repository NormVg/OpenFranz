import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlannerItemSchema,
  updatePlannerItemSchema,
} from "../shared/schemas/plan.ts";
import {
  PLAN_PLATFORMS,
  PLAN_PLATFORM_LABELS,
  PLAN_STATUS_LABELS,
  groupPlannerItems,
  isIsoDateString,
} from "../shared/utils/plan.ts";

test("accepts only real calendar dates", () => {
  assert.equal(isIsoDateString("2026-11-08"), true);
  assert.equal(isIsoDateString("2026-02-30"), false);
  assert.equal(isIsoDateString("01-02-2026"), false);
  assert.equal(isIsoDateString("next tuesday"), false);
});

test("every platform and status has a display label", () => {
  for (const platform of PLAN_PLATFORMS) {
    assert.ok(PLAN_PLATFORM_LABELS[platform].length > 0);
  }
  for (const status of ["planned", "drafted", "published"] as const) {
    assert.ok(PLAN_STATUS_LABELS[status].length > 0);
  }
});

test("accepts a planner item with defaults", () => {
  const parsed = createPlannerItemSchema.parse({
    title: "Cold brew launch reel",
    platform: "instagram",
    plannedDate: "2026-11-10",
  });

  assert.equal(parsed.format, "");
  assert.equal(parsed.brand, "");
  assert.equal(parsed.status, "planned");
  assert.equal(parsed.scriptId, null);
});

test("rejects invalid planner input", () => {
  assert.equal(
    createPlannerItemSchema.safeParse({
      title: "x",
      platform: "myspace",
      plannedDate: "2026-11-10",
    }).success,
    false,
  );
  assert.equal(
    createPlannerItemSchema.safeParse({
      title: "x",
      platform: "instagram",
      plannedDate: "tomorrow",
    }).success,
    false,
  );
  assert.equal(
    createPlannerItemSchema.safeParse({
      title: "",
      platform: "instagram",
      plannedDate: "2026-11-10",
    }).success,
    false,
  );
  assert.equal(
    createPlannerItemSchema.safeParse({
      title: "x",
      platform: "instagram",
      plannedDate: "2026-11-10",
      scriptId: "not-a-uuid",
    }).success,
    false,
  );
});

test("accepts partial planner updates", () => {
  const parsed = updatePlannerItemSchema.parse({ status: "published" });

  assert.equal(parsed.status, "published");
  assert.equal(parsed.title, undefined);
});

test("bands planner items into calendar weeks from Monday", () => {
  // 2026-11-11 is a Wednesday, so the week runs Nov 9 to Nov 15.
  const groups = groupPlannerItems(
    [
      { id: 1, plannedDate: "2026-11-08" },
      { id: 2, plannedDate: "2026-11-09" },
      { id: 3, plannedDate: "2026-11-11" },
      { id: 4, plannedDate: "2026-11-15" },
      { id: 5, plannedDate: "2026-11-16" },
      { id: 6, plannedDate: "2026-11-23" },
      { id: 7, plannedDate: "2026-12-01" },
    ],
    "2026-11-11",
  );

  const byId = Object.fromEntries(
    groups.map((group) => [group.id, group.items.map((item) => item.id)]),
  );

  assert.deepEqual(byId.past, [1]);
  assert.deepEqual(byId.thisWeek, [2, 3, 4]);
  assert.deepEqual(byId.nextWeek, [5]);
  assert.deepEqual(byId.later, [6, 7]);
});
