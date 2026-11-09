import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  getActiveStrategy,
  getStrategy,
} from "../../server/services/strategy.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Read the active content strategy, or a specific saved strategy by id. Call it before proposing or saving a content plan so the cadence, platforms, priorities, and constraints match the strategy.",
  inputSchema: z.object({
    id: z
      .string()
      .optional()
      .describe("A specific strategy id. Omit to read the active strategy."),
  }),
  async execute(input) {
    return runTool(async () => {
      const strategy = input.id
        ? await findById(input.id)
        : await getActiveStrategy();

      if (!strategy) {
        return {
          found: false,
          note: input.id
            ? "No strategy with that id. Call strategy_list to see what exists."
            : "No active strategy yet. Ask the user how they want to plan content, then save it with strategy_write.",
        };
      }

      return {
        found: true,
        id: strategy.id,
        title: strategy.title,
        isActive: strategy.isActive,
        content: strategy.content,
        updatedAt: strategy.updatedAt,
      };
    });
  },
});
