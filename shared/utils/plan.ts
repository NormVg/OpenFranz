export const PLAN_PLATFORMS = [
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
  "x",
  "other",
] as const;

export type PlanPlatform = (typeof PLAN_PLATFORMS)[number];

export const PLAN_STATUSES = ["planned", "drafted", "published"] as const;

export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_PLATFORM_LABELS: Record<PlanPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
  other: "Other",
};

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  planned: "Planned",
  drafted: "Drafted",
  published: "Published",
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts only real calendar dates in `YYYY-MM-DD` form. `2026-02-30` is
 * rejected even though it matches the shape.
 */
export function isIsoDateString(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.toISOString().slice(0, 10) === value;
}

const MS_PER_DAY = 86_400_000;

export type PlannerGroupIds = "past" | "thisWeek" | "nextWeek" | "later";

export type PlannerGroup<T> = {
  id: PlannerGroupIds;
  items: T[];
};

export const PLANNER_GROUP_LABELS: Record<PlannerGroupIds, string> = {
  past: "Past",
  thisWeek: "This week",
  nextWeek: "Next week",
  later: "Later",
};

function toUtcMs(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime();
}

function startOfWeekMonday(dayMs: number): number {
  const day = new Date(dayMs);
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  return dayMs - daysSinceMonday * MS_PER_DAY;
}

/**
 * Bands items into calendar weeks, Monday to Sunday, relative to today.
 * Items with an unreadable date land in `later` rather than vanishing.
 */
export function groupPlannerItems<T extends { plannedDate: string }>(
  items: T[],
  todayIso: string,
): PlannerGroup<T>[] {
  const groups: Record<PlannerGroupIds, T[]> = {
    past: [],
    thisWeek: [],
    nextWeek: [],
    later: [],
  };

  const today = toUtcMs(todayIso);
  const weekStart = Number.isNaN(today) ? toUtcMs(isoToday()) : startOfWeekMonday(today);
  const thisWeekEnd = weekStart + 7 * MS_PER_DAY;
  const nextWeekEnd = weekStart + 14 * MS_PER_DAY;

  for (const item of items) {
    const date = toUtcMs(item.plannedDate);

    if (!Number.isNaN(date) && date < weekStart) {
      groups.past.push(item);
    } else if (!Number.isNaN(date) && date < thisWeekEnd) {
      groups.thisWeek.push(item);
    } else if (!Number.isNaN(date) && date < nextWeekEnd) {
      groups.nextWeek.push(item);
    } else {
      groups.later.push(item);
    }
  }

  return [
    { id: "past", items: groups.past },
    { id: "thisWeek", items: groups.thisWeek },
    { id: "nextWeek", items: groups.nextWeek },
    { id: "later", items: groups.later },
  ];
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
