import { z } from "zod";

export const scriptIdSchema = z.string().uuid();

export const createScriptSchema = z.object({
  title: z.string().trim().min(1, "A script title is required.").max(200),
  brand: z.string().trim().max(120).default(""),
  content: z
    .string()
    .trim()
    .min(1, "Script content is required.")
    .max(100_000),
  note: z.string().trim().max(500).default(""),
});

export const saveScriptVersionSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  brand: z.string().trim().max(120).optional(),
  content: z
    .string()
    .trim()
    .min(1, "Script content is required.")
    .max(100_000),
  note: z.string().trim().max(500).default(""),
});

export const restoreScriptVersionSchema = z.object({
  versionNumber: z
    .number()
    .int()
    .min(1, "A version number is required."),
});
