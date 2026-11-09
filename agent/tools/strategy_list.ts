import { defineTool } from "eve/tools";
import { z } from "zod";
import { listStrategies } from "../../server/services/strategy.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "List the saved content strategies with their ids and which one is active. Call it to see what exists before writing a strategy or switching the active one.",
  inputSchema: z.object({}),
  async execute() {
    return runTool(async () => {
      const all = await listStrategies();

      return {
        count: all.length,
        strategies: all.map((strategy) => ({
          id: strategy.id,
          title: strategy.title,
          isActive: strategy.isActive,
          updatedAt: strategy.updatedAt,
        })),
      };
    });
  },
});
