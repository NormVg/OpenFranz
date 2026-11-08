import { z } from "zod";
import {
  PLAN_PLATFORMS,
  PLAN_STATUSES,
  isIsoDateString,
} from "../utils/plan";

export const plannerItemIdSchema = z.string().uuid();

export const createPlannerItemSchema = z.object({
  title: z.string().trim().min(1, "A title is required.").max(200),
  platform: z.enum(PLAN_PLATFORMS, {
    message: "Choose a platform.",
  }),
  format: z.string().trim().max(80).default(""),
  brand: z.string().trim().max(120).default(""),
  plannedDate: z
    .string()
    .refine(isIsoDateString, "A valid date in YYYY-MM-DD form is required."),
  plannedTime: z.string().trim().max(40).default(""),
  status: z.enum(PLAN_STATUSES).default("planned"),
  rationale: z.string().trim().max(2000).default(""),
  scriptId: z.string().uuid().nullable().default(null),
});

export const updatePlannerItemSchema = createPlannerItemSchema.partial();
