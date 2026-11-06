import { defineTool } from "eve/tools";
import { z } from "zod";
import { getBrand } from "../../server/services/brand.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Read a brand's full product information: summary, website, audience, tone, products with features and pricing, and notes. Accepts a brand id or slug.",
  inputSchema: z.object({
    idOrSlug: z.string().describe("The brand id or slug."),
  }),
  async execute(input) {
    return runTool(() => getBrand(input.idOrSlug));
  },
});
