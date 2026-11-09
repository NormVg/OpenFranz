import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  createStrategy,
  updateStrategy,
} from "../../server/services/strategy.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Create a content strategy, or update one that exists. Call it when the user defines or changes how they want to plan content: cadence, platforms, priorities, formats, and constraints. Exactly one strategy is active at a time, and the active one guides every content plan.",
  inputSchema: z.object({
    id: z
      .string()
      .optional()
      .describe("Existing strategy id to update. Omit to create a new one."),
    title: z.string().describe("A short, specific title for the strategy."),
    content: z
      .string()
      .describe(
        "The strategy in markdown: posting cadence, platforms, priorities, formats, constraints, and what to avoid.",
      ),
    active: z
      .boolean()
      .optional()
      .describe(
        "Set true to make this the active strategy. A new strategy becomes active automatically when none is.",
      ),
  }),
  async execute(input) {
    return runTool(async () => {
      const payload: {
        title: string;
        content: string;
        isActive?: boolean;
      } = {
        title: input.title,
        content: input.content,
      };

      if (input.active !== undefined) payload.isActive = input.active;

      const saved = input.id
        ? await updateStrategy(input.id, payload)
        : await createStrategy(payload);

      return {
        id: saved.id,
        title: saved.title,
        isActive: saved.isActive,
        note: saved.isActive
          ? "Saved. This is the active strategy every content plan follows."
          : "Saved. Pass active: true when it should guide the plan.",
      };
    });
  },
});
