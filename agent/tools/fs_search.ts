import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Fuzzy-search file and folder paths in the knowledge filesystem. Search before writing so you update an existing document instead of creating a near-duplicate.",
  inputSchema: z.object({
    query: z.string().describe("Part of a file name or path."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of matches to return."),
  }),
  async execute(input) {
    return runTool(() => vfs.find(input.query, input.limit));
  },
});
