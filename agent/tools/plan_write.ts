import { defineTool } from "eve/tools";
import { z } from "zod";
import { PLAN_PLATFORMS, PLAN_STATUSES } from "../../shared/utils/plan";
import { createItem, updateItem } from "../../server/services/plan.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Add a planned piece of content to the content plan, or update one already there. Call this when the user asks for a content plan, asks when to post something, or agrees to a schedule you proposed. Every item needs a real date and a one-line rationale naming why that day and slot works.",
  inputSchema: z.object({
    id: z
      .string()
      .optional()
      .describe("Existing planned item id to update. Omit to add a new item."),
    title: z.string().describe("What the piece of content is."),
    platform: z
      .enum(PLAN_PLATFORMS)
      .describe("Where it will be posted."),
    format: z
      .string()
      .optional()
      .describe("The format, such as reel, carousel, story, or long-form."),
    brand: z.string().optional().describe("The brand it is for, if any."),
    date: z
      .string()
      .describe("The day to post, in YYYY-MM-DD form."),
    time: z
      .string()
      .optional()
      .describe("A posting time hint, such as 19:00 or weekday evening."),
    status: z
      .enum(PLAN_STATUSES)
      .optional()
      .describe("Defaults to planned. Use drafted or published only when true."),
    rationale: z
      .string()
      .optional()
      .describe("One line on why this day and slot works."),
    scriptId: z
      .string()
      .optional()
      .describe("Id of a saved script this item delivers, if any."),
  }),
  async execute(input) {
    return runTool(async () => {
      const payload = {
        title: input.title,
        platform: input.platform,
        format: input.format ?? "",
        brand: input.brand ?? "",
        plannedDate: input.date,
        plannedTime: input.time ?? "",
        status: input.status ?? "planned",
        rationale: input.rationale ?? "",
        scriptId: input.scriptId ?? null,
      };

      const saved = input.id
        ? await updateItem(input.id, payload)
        : await createItem(payload);

      return {
        id: saved.id,
        date: saved.plannedDate,
        title: saved.title,
        note: input.id
          ? "Updated the planned item."
          : "Added to the plan. It is visible on the Plan page.",
      };
    });
  },
});
