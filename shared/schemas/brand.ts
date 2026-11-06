import { z } from "zod";

export const brandIdSchema = z.string().uuid();

export const brandProductSchema = z.object({
  name: z.string().trim().min(1, "A product name is required.").max(120),
  description: z.string().trim().max(2000).default(""),
  features: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  pricing: z.string().trim().max(500).default(""),
});

export const createBrandSchema = z.object({
  name: z.string().trim().min(1, "A brand name is required.").max(120),
  summary: z.string().trim().max(2000).default(""),
  website: z.string().trim().max(500).default(""),
  audience: z.string().trim().max(500).default(""),
  tone: z.string().trim().max(500).default(""),
  products: z.array(brandProductSchema).max(20).default([]),
  notes: z.string().max(20000).default(""),
});

export const updateBrandSchema = createBrandSchema.partial();
