import { defineTool } from "eve/tools";
import { z } from "zod";
import { webSearch } from "../lib/ollama-web";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Search the web for current information. Returns titles, URLs, and content snippets.",
  inputSchema: z.object({
    query: z.string().describe("The search query."),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe("Maximum number of results, from 1 to 10."),
  }),
  async execute(input) {
    return runTool(() => webSearch(input.query, input.maxResults));
  },
});
