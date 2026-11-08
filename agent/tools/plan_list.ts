import { defineTool } from "eve/tools";
import { z } from "zod";
import { listItems } from "../../server/services/plan.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Read the current content plan: every planned item with its date, platform, format, status, and rationale. Call this before building or changing a plan so you do not double-book a day, and when the user asks what is planned.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(30)
      .describe("How many items to return, soonest first."),
  }),
  async execute(input) {
    return runTool(async () => {
      const items = await listItems();

      return {
        items: items.slice(0, input.limit).map((item) => ({
          id: item.id,
          title: item.title,
          platform: item.platform,
          format: item.format,
          brand: item.brand,
          date: item.plannedDate,
          time: item.plannedTime,
          status: item.status,
          rationale: item.rationale,
          scriptId: item.scriptId,
        })),
        note:
          items.length === 0
            ? "The plan is empty. Propose items with dates before writing any."
            : "Use these to avoid double-booking days and to match the cadence already chosen.",
      };
    });
  },
});
