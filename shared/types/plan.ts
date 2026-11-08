import type { PlanPlatform, PlanStatus } from "../utils/plan";

export type PlannerItemRecord = {
  id: string;
  title: string;
  platform: PlanPlatform;
  format: string;
  brand: string;
  plannedDate: string;
  plannedTime: string;
  status: PlanStatus;
  rationale: string;
  scriptId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlannerItemInput = {
  title: string;
  platform: PlanPlatform;
  format?: string;
  brand?: string;
  plannedDate: string;
  plannedTime?: string;
  status?: PlanStatus;
  rationale?: string;
  scriptId?: string | null;
};
