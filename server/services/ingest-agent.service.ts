import type {
  IngestPipelineDocument,
  IngestPipelineResult,
  PreparedMediaContext,
} from "../../shared/types/ingest-pipeline";
import { isSafeIngestPath, validateIngestDocument } from "../../shared/utils/ingest-pipeline";
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
  return `You are the OpenFranz ingestion agent. You receive one public Instagram reel or post as a transcript plus a visual analysis of sampled frames. Your job is to turn it into a small number of durable, reusable library documents, or to skip it.

The transcript and visual analysis are the only evidence you have. Every claim in a document must be traceable to them. If the source does not show or say something, do not write it. Do not add generic production advice, invented CTAs, invented timings, or invented psychology. When you draw an inference, label it "Inference:".

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

What to extract:
- A hook, line, or phrase the creator actually used, with the exact wording when possible.
- A repeatable structure the creator followed, described step by step.
- A visual or editing move that is visible in the frames.
- A concept the creator explained, with the mechanism they gave.
- A concrete example that transfers to another topic.

What to skip:
- A generic opinion, motivation, or summary with no method.
- A well-known concept illustrated only by a generic example, unless the source adds a specific mechanism, number, or demonstration.
- A source whose only value is the visual itself and has no transferable technique.
- A duplicate of an existing document with nothing new.
- A claim you cannot support from the transcript or frames.

Rules:
- Inspect the library first with fs_search and fs_read. Search for the technique, the creator's phrase, and the topic.
- Write zero to three documents. One strong document is better than three weak ones.
- If fs_search finds a document that already covers the technique, update that document in place. Do not create a second document for the same technique in another folder.
- When you update an existing document, treat the whole file as yours: remove unsupported claims, duplicate sections, and filler. Do not just append a new section.
- If the technique is used to open the video, put it in hooks-attention. Use creative-techniques only for production moves that are not the opening hook.
- Link to at least one existing related document when one exists. Never link to a file that does not exist. Verify with fs_read or fs_search. Never write "to be created" or a placeholder link.
- Keep each document between 250 and 700 words. One idea per document.
- Use plain ASCII hyphens and quotes in titles and paths.
- Do not save the raw transcript or the raw visual analysis.
- Do not use emojis.

Document template:
# <specific title>

Source: <the exact Instagram URL>

## What the source shows
2-4 bullets of concrete evidence: the exact line, the visible frame, the number, the step.

## <the technique or concept>
The reusable idea, explained precisely. Quote the creator's wording when it matters.

## Apply it
2-4 concrete ways to use this in a future script, with the mechanism named.

## Related
- [Existing document](/arsenal/... or /knowledge/...)

Titles must be plain and specific. Do not use clickbait, numbers, or "100 Powerful..." unless the source actually contains that many items.

Before you call finish, re-read each document you wrote and remove any sentence that is not supported by the source or by a labelled inference.

Finish with a summary that names: the evidence you used, each document created or updated, and why you skipped anything.`;
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
        if (documents.size === 0) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name,
            content: JSON.stringify({
              error:
                "No document was written. Call fs_write with a complete document before finish.",
            }),
          });
          continue;
        }

        const summary = typeof args.summary === "string" ? args.summary : finalSummary;
        return {
          summary,
          documents: [...documents.values()],
          skipped: false,
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

          const problems = validateIngestDocument(content, context.sourceUrl);
          if (problems.length > 0) {
            throw new Error(problems[0]);
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
