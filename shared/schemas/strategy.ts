import { z } from "zod";

export const strategyIdSchema = z.string().uuid();

export const strategyTitleSchema = z
  .string()
  .trim()
  .min(1, "A title is required.")
  .max(120, "Strategy titles must be 120 characters or fewer.");

export const strategyContentSchema = z
  .string()
  .trim()
  .min(1, "The strategy content is required.")
  .max(20_000, "Strategies must be 20,000 characters or fewer.");

export const createStrategySchema = z.object({
  title: strategyTitleSchema,
  content: strategyContentSchema,
  isActive: z.boolean().optional(),
});

export const updateStrategySchema = createStrategySchema
  .partial()
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one strategy field is required.",
  });
