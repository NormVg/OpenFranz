import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "List files connected to a file through the knowledge graph, up to a depth of 5.",
  inputSchema: z.object({
    path: z.string().describe("Absolute file path."),
    depth: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(1)
      .describe("How many link hops to follow."),
  }),
  async execute(input) {
    return runTool(() => vfs.related(input.path, input.depth));
  },
});
