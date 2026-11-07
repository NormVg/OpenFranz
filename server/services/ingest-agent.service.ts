import type {
  IngestPipelineDocument,
  IngestPipelineResult,
  PreparedMediaContext,
} from "../../shared/types/ingest-pipeline";
import { isSafeIngestPath } from "../../shared/utils/ingest-pipeline";
import { extractVfsLinks, resolveVfsLink } from "../../shared/utils/vfs-links";
import { vfs } from "./vfs.service";
import {
  ollamaChat,
  type OllamaMessage,
  type OllamaToolCall,
} from "./ollama.service";

const MODEL = "gpt-oss:120b-cloud";
const MAX_STEPS = 14;

const tools = [
  {
    type: "function",
    function: {
      name: "fs_list",
      description: "List files and folders in the shared knowledge filesystem.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path, for example /arsenal." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fs_read",
      description: "Read a Markdown file from the shared knowledge filesystem.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute file path." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fs_search",
      description: "Fuzzy-search existing files to avoid duplicate knowledge.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 10 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fs_write",
      description: "Create or update a Markdown document in /arsenal or /knowledge.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute .md path under /arsenal or /knowledge." },
          content: { type: "string", description: "Complete Markdown document content." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fs_links",
      description: "Read outgoing links and backlinks for a file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish",
      description: "Finish the ingestion pass after writing useful documents or deciding to skip.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "What was learned, written, updated, or skipped." },
          skipped: { type: "boolean", description: "True when nothing was worth saving." },
        },
        required: ["summary", "skipped"],
      },
    },
  },
] as const;

function systemInstructions(): string {
  return `You are the dedicated OpenFranz ingestion agent. You receive prepared context from one public Instagram reel or post and work thoroughly with filesystem tools before finishing.

Library structure:
- /arsenal/hooks-attention: verbal, text, and visual hooks and attention triggers.
- /arsenal/language-bank: phrases, CTAs, opening and closing lines, transitions, power words.
- /arsenal/storytelling: story structures, narrative patterns, examples.
- /arsenal/frameworks-templates: script frameworks, copywriting formulas, reusable structures.
- /arsenal/creative-techniques: creative devices, visual techniques, transitions, editing ideas.
- /arsenal/swipe-files: strong scripts, creator examples, references, viral breakdowns.
- /knowledge/psychology-attention: human behaviour, curiosity, emotion, attention, persuasion.
- /knowledge/writing-copywriting: copywriting principles, voice, tonality, communication.
- /knowledge/storytelling-retention: narrative theory, pacing, retention, arcs, curiosity loops.
- /knowledge/content-strategy: pillars, audience research, positioning, platform behaviour.
- /knowledge/creative-thinking: ideation, creative principles, pattern recognition, originality.
- /knowledge/audience-insights: audience interests, pain points, feedback, trends, expectations.

Rules:
- Inspect the existing library before writing. Use fs_search and fs_read to find related material and avoid duplicates.
- Write between zero and three Markdown documents. Skip the source entirely when it has no distinctive, reusable value.
- Prefer improving an existing document over creating a near-duplicate. Create a new document only when it adds something clearly useful.
- Every document must have a clear title and a source line containing the original Instagram URL.
- Every link must point to a file that already exists. Verify with fs_read or fs_search before linking. Never link to a file you have not confirmed exists.
- Extract hooks, phrases, frameworks, techniques, and concepts only when they are genuinely good. Do not force every category.
- Do not include generic advice, filler, or broad summaries. Every section must be specific to the source.
- Prefer one focused document over a broad overview. Do not write sample copy unless the source demonstrates it; label any adaptation clearly.
- Do not save a raw transcript or a visual description unless it is useful reference material by itself.
- Use Markdown links to related files when that improves recall.
- Call finish exactly once when done. Set skipped=true only when no document was written.`;
}

function userPrompt(context: PreparedMediaContext): string {
  return `Source: ${context.sourceUrl}
Media type: ${context.mediaType}
Frames analyzed: ${context.frameCount}

Speech transcript:
${context.transcript || "(no speech transcript)"}

Visual analysis:
${context.visualAnalysis || "(no visual analysis)"}

Inspect the library, decide what is genuinely worth keeping, write or update the appropriate documents, then finish.`;
}

function parseArguments(call: OllamaToolCall): Record<string, unknown> {
  try {
    const parsed = JSON.parse(call.function.arguments || "{}") as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function documentTitle(path: string, content: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return path.split("/").pop()?.replace(/\.md$/, "") ?? path;
}

export async function runIngestionAgent(
  context: PreparedMediaContext,
): Promise<IngestPipelineResult> {
  const messages: OllamaMessage[] = [
    { role: "system", content: systemInstructions() },
    { role: "user", content: userPrompt(context) },
  ];
  const documents = new Map<string, IngestPipelineDocument>();
  let finalSummary = "Ingestion finished.";

  for (let step = 0; step < MAX_STEPS; step += 1) {
    const response = await ollamaChat({ model: MODEL, messages, tools: [...tools] });
    messages.push({
      role: "assistant",
      content: response.content || null,
      tool_calls: response.toolCalls.length > 0 ? response.toolCalls : undefined,
    });

    if (response.toolCalls.length === 0) {
      if (response.content.trim()) finalSummary = response.content.trim();
      break;
    }

    for (const call of response.toolCalls) {
      const name = call.function.name;
      const args = parseArguments(call);

      if (name === "finish") {
        const summary = typeof args.summary === "string" ? args.summary : finalSummary;
        return {
          summary,
          documents: [...documents.values()],
          skipped: documents.size === 0,
          mediaType: context.mediaType,
          transcriptCharacters: context.transcript.length,
          framesAnalyzed: context.frameCount,
        };
      }

      let output: unknown;
      try {
        if (name === "fs_list") {
          const path = typeof args.path === "string" ? args.path : "/";
          const entries = await vfs.list(path);
          output = entries.map((entry) => ({
            path: entry.path,
            name: entry.name,
            type: entry.type,
            updatedAt: entry.updatedAt,
          }));
        } else if (name === "fs_read") {
          const path = String(args.path ?? "");
          const content = await vfs.readFile(path);
          output = { path, content: content.slice(0, 12_000) };
        } else if (name === "fs_search") {
          const query = String(args.query ?? "");
          const limit = typeof args.limit === "number" ? args.limit : 10;
          const entries = await vfs.find(query, limit);
          output = entries.map((entry) => ({ path: entry.path, type: entry.type }));
        } else if (name === "fs_write") {
          const path = String(args.path ?? "");
          const content = String(args.content ?? "");
          if (!isSafeIngestPath(path)) {
            throw new Error("Only .md files under /arsenal or /knowledge are allowed.");
          }
          if (content.length > 20_000) {
            throw new Error("The document is too long.");
          }

          const missing: string[] = [];
          for (const reference of extractVfsLinks(content)) {
            const target = resolveVfsLink(path, reference.target);
            if (!target) continue;
            const existingTarget = await vfs.stat(target);
            if (!existingTarget) missing.push(target);
          }
          if (missing.length > 0) {
            throw new Error(
              `Links target missing files: ${missing.join(", ")}. Remove or fix them before writing.`,
            );
          }

          const existing = await vfs.stat(path);
          await vfs.writeFile(path, content);
          documents.set(path, {
            path,
            title: documentTitle(path, content),
            action: existing ? "updated" : "created",
          });
          output = { path, action: existing ? "updated" : "created" };
        } else if (name === "fs_links") {
          output = await vfs.links(String(args.path ?? ""));
        } else {
          output = { error: `Unknown tool: ${name}` };
        }
      } catch (error) {
        output = {
          error: error instanceof Error ? error.message : "The tool call failed.",
        };
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name,
        content: JSON.stringify(output),
      });
    }
  }

  return {
    summary: finalSummary,
    documents: [...documents.values()],
    skipped: documents.size === 0,
    mediaType: context.mediaType,
    transcriptCharacters: context.transcript.length,
    framesAnalyzed: context.frameCount,
  };
}
