import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import type { VfsEntry } from "../../shared/types/vfs";
import { runTool } from "../lib/tool-result";

const MAX_CHARS_PER_FILE = 4_000;

function tokenize(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

  return [...new Set(tokens)].slice(0, 6);
}

export default defineTool({
  description:
    "Gather relevant material from /arsenal and /knowledge before writing. Searches the library, reads the strongest matches, and returns their content. Call this before writing any script, hook, CTA, post, caption, outline, or rewrite.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The topic, technique, audience problem, or phrase to look up."),
    focus: z
      .enum(["both", "arsenal", "knowledge"])
      .default("both")
      .describe("Restrict the search to one root, or search both."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(3)
      .describe("How many files to read."),
  }),
  async execute(input) {
    return runTool(async () => {
      const prefix =
        input.focus === "arsenal"
          ? "/arsenal/"
          : input.focus === "knowledge"
            ? "/knowledge/"
            : null;

      const tokens = tokenize(input.query);
      const scored = new Map<string, { entry: VfsEntry; score: number }>();

      for (const token of tokens.length > 0 ? tokens : [input.query]) {
        const matches = await vfs.find(token, input.limit * 4);

        for (const entry of matches) {
          if (entry.type !== "file") continue;
          if (prefix && !entry.path.startsWith(prefix)) continue;

          const current = scored.get(entry.path);
          if (current) current.score += 1;
          else scored.set(entry.path, { entry, score: 1 });
        }
      }

      const files = [...scored.values()]
        .sort(
          (left, right) =>
            right.score - left.score ||
            left.entry.path.localeCompare(right.entry.path),
        )
        .slice(0, input.limit)
        .map((item) => item.entry);

      const documents = [];
      for (const file of files) {
        const content = await vfs.readFile(file.path);
        documents.push({
          path: file.path,
          title: file.name,
          updatedAt: file.updatedAt,
          content: content.slice(0, MAX_CHARS_PER_FILE),
        });
      }

      return {
        query: input.query,
        focus: input.focus,
        tokens,
        documents,
        note:
          documents.length === 0
            ? "No library match. Say so in one line and write from first principles."
            : "Use the strongest specific line, structure, or mechanism from these documents. Do not dump them.",
      };
    });
  },
});
