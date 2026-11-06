import { defineTool } from "eve/tools";
import { z } from "zod";
import { vfs } from "../../server/services/vfs.service";
import { runTool } from "../lib/vfs-tool";

export default defineTool({
  description:
    "Return the full knowledge graph: every file and folder plus every link between files.",
  inputSchema: z.object({}),
  async execute() {
    return runTool(() => vfs.graph());
  },
});
