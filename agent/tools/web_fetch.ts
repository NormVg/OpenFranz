import { defineTool } from "eve/tools";
import { z } from "zod";
import { webFetch } from "../lib/ollama-web";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Fetch a web page by URL and return its title, main content, and links.",
  inputSchema: z.object({
    url: z.url().describe("The absolute URL to fetch."),
  }),
  async execute(input) {
    return runTool(() => webFetch(input.url));
  },
});
