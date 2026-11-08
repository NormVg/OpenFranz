import { defineTool } from "eve/tools";
import { z } from "zod";
import { listScripts } from "../../server/services/script.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "List the scripts saved in the shared script library, newest first. Call this before saving a script that may already exist: pass the matching id or slug to script_store so it becomes a new version of that script instead of a duplicate. Also use it when the user asks what is saved in the library.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(30)
      .describe("How many scripts to return."),
  }),
  async execute(input) {
    return runTool(async () => {
      const scripts = await listScripts();

      return {
        scripts: scripts.slice(0, input.limit).map((script) => ({
          id: script.id,
          slug: script.slug,
          title: script.title,
          brand: script.brand,
          versionCount: script.versionCount,
          updatedAt: script.updatedAt,
        })),
        note:
          scripts.length === 0
            ? "The script library is empty. A new save will create the first script."
            : "If the script you are about to save already exists here, pass its id or slug to script_store to add a version.",
      };
    });
  },
});
