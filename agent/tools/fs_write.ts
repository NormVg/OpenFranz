import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { extractVfsLinks, resolveVfsLink } from "../../shared/utils/vfs-links";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Create or overwrite a Markdown file in the knowledge filesystem. Use the library document shape: a level-1 title, a Source line, an evidence section, an application section, and links only to files that already exist. Wiki links such as [[/arsenal/other.md]] and Markdown links are indexed automatically. Only /arsenal and /knowledge may exist at the root.",
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
    return runTool(async () => {
      const missing: string[] = [];

      for (const reference of extractVfsLinks(input.content)) {
        const target = resolveVfsLink(input.path, reference.target);
        if (!target) continue;

        const existing = await vfs.stat(target);
        if (!existing) missing.push(target);
      }

      if (missing.length > 0) {
        throw new Error(
          `Links target missing files: ${missing.join(", ")}. Create them first or remove the links.`,
        );
      }

      return vfs.writeFile(input.path, input.content, input.meta ?? {});
    });
  },
});
