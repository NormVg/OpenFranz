import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "Move or rename a file or directory in the knowledge filesystem. Links that point at the old path are retargeted.",
  inputSchema: z.object({
    from: z.string().describe("Current absolute path."),
    to: z.string().describe("New absolute path."),
  }),
  async execute(input) {
    return runTool(() => vfs.move(input.from, input.to));
  },
});
