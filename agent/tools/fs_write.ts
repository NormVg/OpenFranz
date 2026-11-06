import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "Create or overwrite a text file in the knowledge filesystem. Wiki links such as [[/arsenal/other.md]] and Markdown links are indexed automatically. Only /arsenal and /tecniques may exist at the root.",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Absolute file path, for example /arsenal/notes.md."),
    content: z.string().describe("Full file content to write."),
    meta: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Optional metadata to store with the file."),
  }),
  async execute(input) {
    return runTool(() =>
      vfs.writeFile(input.path, input.content, input.meta ?? {}),
    );
  },
});
