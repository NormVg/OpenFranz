import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "List the entries in a directory of the knowledge filesystem. The root contains exactly two folders: /arsenal and /tecniques.",
  inputSchema: z.object({
    path: z
      .string()
      .default("/")
      .describe("Absolute directory path, for example /arsenal."),
  }),
  async execute(input) {
    return runTool(() => vfs.list(input.path));
  },
});
