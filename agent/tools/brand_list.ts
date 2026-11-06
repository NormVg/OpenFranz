import { defineTool } from "eve/tools";
import { z } from "zod";
import { listBrands } from "../../server/services/brand.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "List the product brands in the shared workspace. Each result includes the brand name, slug, summary, and product names.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        "Optional text to filter brands by name, summary, or product name.",
      ),
  }),
  async execute(input) {
    return runTool(async () => {
      const brands = await listBrands();
      const query = input.query?.trim().toLowerCase();

      const filtered = query
        ? brands.filter((brand) => {
            const haystack = [
              brand.name,
              brand.slug,
              brand.summary,
              ...brand.products.map((product) => product.name),
            ]
              .join(" ")
              .toLowerCase();

            return haystack.includes(query);
          })
        : brands;

      return filtered.map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        summary: brand.summary,
        products: brand.products.map((product) => product.name),
        updatedAt: brand.updatedAt,
      }));
    });
  },
});
