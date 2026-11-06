import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "Delete a file or directory from the knowledge filesystem. Directories must be empty unless recursive is true. The two root folders cannot be removed.",
  inputSchema: z.object({
    path: z.string().describe("Absolute path to delete."),
    recursive: z
      .boolean()
      .default(false)
      .describe("Delete a directory and everything inside it."),
  }),
  async execute(input) {
    return runTool(async () => {
      const removed = await vfs.remove(input.path, {
        recursive: input.recursive,
      });
      return { path: input.path, removed };
    });
  },
});
