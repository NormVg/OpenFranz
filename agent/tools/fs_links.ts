import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "List the outgoing links and backlinks for a file in the knowledge graph.",
  inputSchema: z.object({
    path: z.string().describe("Absolute file path."),
  }),
  async execute(input) {
    return runTool(() => vfs.links(input.path));
  },
});
