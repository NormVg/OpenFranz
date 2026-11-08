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
