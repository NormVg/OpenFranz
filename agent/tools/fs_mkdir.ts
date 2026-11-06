import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Create a directory in the knowledge filesystem. Only /arsenal and /tecniques may exist at the root.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Absolute directory path, for example /arsenal/drafts."),
    meta: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Optional metadata to store with the directory."),
  }),
  async execute(input) {
    return runTool(() => vfs.mkdir(input.path, input.meta ?? {}));
  },
});
