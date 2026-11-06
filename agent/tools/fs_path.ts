import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "Find the shortest directed link path between two files in the knowledge graph. Returns null when no path exists.",
  inputSchema: z.object({
    from: z.string().describe("Absolute path of the starting file."),
    to: z.string().describe("Absolute path of the destination file."),
  }),
  async execute(input) {
    return runTool(() => vfs.pathBetween(input.from, input.to));
  },
});
