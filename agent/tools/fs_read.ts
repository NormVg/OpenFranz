import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "Read the full text content of a file in the knowledge filesystem.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Absolute file path, for example /arsenal/notes.md."),
  }),
  async execute(input) {
    return runTool(async () => {
      const content = await vfs.readFile(input.path);
      return { path: input.path, content, characters: content.length };
    });
  },
});
