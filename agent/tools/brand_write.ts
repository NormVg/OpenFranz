import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  createBrand,
  getBrand,
  updateBrand,
} from "../../server/services/brand.service";
import { runTool } from "../lib/tool-result";

const productSchema = z.object({
  name: z.string().describe("Product name."),
  description: z.string().default("").describe("What the product is."),
  features: z.array(z.string()).default([]).describe("Key product features."),
  pricing: z.string().default("").describe("Pricing summary."),
});

export default defineTool({
  description:
    "Create or update a brand in the shared workspace. Only call this when the user explicitly asks to save or change brand information.",
  inputSchema: z.object({
    idOrSlug: z
      .string()
      .optional()
      .describe("Existing brand id or slug to update. Omit to create a brand."),
    name: z.string().describe("Brand name."),
    summary: z.string().optional().describe("Short brand summary."),
    website: z.string().optional().describe("Brand website."),
    audience: z.string().optional().describe("Who the brand serves."),
    tone: z.string().optional().describe("Brand voice and tone."),
    products: z
      .array(productSchema)
      .optional()
      .describe("Products sold under the brand."),
    notes: z.string().optional().describe("Freeform product-specific notes."),
  }),
  async execute(input) {
    return runTool(async () => {
      const payload = {
        name: input.name,
        summary: input.summary,
        website: input.website,
        audience: input.audience,
        tone: input.tone,
        products: input.products,
        notes: input.notes,
      };

      if (!input.idOrSlug) {
        return createBrand(payload);
      }

      const existing = await getBrand(input.idOrSlug);
      return updateBrand(existing.id, payload);
    });
  },
});
