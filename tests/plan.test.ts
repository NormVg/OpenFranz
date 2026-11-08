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
  buildPlannerMonth,
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

test("builds a stable Monday-first month grid", () => {
  // November 2026 starts on a Sunday, so the grid opens on Monday, Oct 26
  // and closes six weeks later on Sunday, Dec 6.
  const cells = buildPlannerMonth(new Date(2026, 10, 8));

  assert.equal(cells.length, 42);
  assert.equal(cells[0].iso, "2026-10-26");
  assert.equal(cells[0].inMonth, false);
  assert.equal(cells[41].iso, "2026-12-06");
  assert.equal(new Date(`${cells[0].iso}T00:00:00`).getDay(), 1);

  const inMonth = cells.filter((cell) => cell.inMonth);

  assert.equal(inMonth.length, 30);
  assert.equal(inMonth[0].iso, "2026-11-01");
  assert.equal(inMonth[29].iso, "2026-11-30");
});

test("month grid shows every calendar date exactly once", () => {
  // January 2027 starts on a Friday, so the grid opens Monday, Dec 28, 2026.
  const cells = buildPlannerMonth(new Date(2027, 0, 15));
  const seen = new Set<string>();

  for (const cell of cells) {
    assert.ok(isIsoDateString(cell.iso));
    assert.equal(seen.has(cell.iso), false);
    seen.add(cell.iso);
  }

  assert.equal(seen.size, 42);
  assert.equal(cells[0].iso, "2026-12-28");

  const inMonth = cells.filter((cell) => cell.inMonth);
  assert.equal(inMonth.length, 31);
});
