import { defineTool } from "eve/tools";
import { z } from "zod";
import { fetchInstagramMedia } from "../../server/services/instagram.service";
import { runTool } from "../lib/tool-result";

export default defineTool({
  description:
    "Fetch the media URLs for a public Instagram post or reel. Only public content is supported; private posts, stories, and profiles are rejected.",
  inputSchema: z.object({
    url: z.string().describe("A public Instagram post or reel URL."),
  }),
  async execute(input) {
    return runTool(() => fetchInstagramMedia(input.url));
  },
});
