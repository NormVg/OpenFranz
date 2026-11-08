import { defineTool } from "eve/tools";
import { z } from "zod";
import { storeScript } from "../../server/services/script.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Save a script to the shared script library, or add a new version to a script already saved there. Call this when the user asks to save, keep, or store a script you just wrote, or when they ask you to revise a saved script. To update an existing script, pass its id or slug; call script_list first to find it. Never claim a script was saved without calling this.",
  inputSchema: z.object({
    idOrSlug: z
      .string()
      .optional()
      .describe(
        "Existing script id or slug to update. Omit to save a new script.",
      ),
    title: z.string().describe("The script title."),
    brand: z
      .string()
      .optional()
      .describe("The brand the script is for, if any."),
    content: z
      .string()
      .describe(
        "The full script markdown, the same text that appeared inside the script card.",
      ),
    note: z
      .string()
      .optional()
      .describe("One line on what this version changes."),
  }),
  async execute(input) {
    return runTool(async () => {
      const saved = await storeScript(
        {
          idOrSlug: input.idOrSlug,
          title: input.title,
          brand: input.brand,
          content: input.content,
          note: input.note,
        },
        "agent",
      );

      return {
        id: saved.id,
        slug: saved.slug,
        title: saved.title,
        versionCount: saved.versions.length,
        latestVersion: saved.versions[0]?.versionNumber ?? 1,
        note: `Saved as version ${saved.versions[0]?.versionNumber ?? 1}. Tell the user it is in the Scripts page.`,
      };
    });
  },
});
