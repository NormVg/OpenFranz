import { ingestSchema } from "../../shared/schemas/ingest";
import type { IngestResult } from "../../shared/types/ingest";
import { createIngestSlug, uniqueIngestPath } from "../../shared/utils/ingest";
import { ServiceError } from "../utils/service-error";
import { webFetch, type WebFetchResponse } from "../utils/ollama-web";
import { vfs } from "./vfs.service";

function formatDocument(
  title: string,
  content: string,
  source?: string,
): string {
  const parts = [`# ${title}`, ""];

  if (source) parts.push(`Source: ${source}`, "");
  parts.push(content.trim(), "");

  return parts.join("\n");
}

async function nextPath(folder: string, title: string): Promise<string> {
  await vfs.mkdir(`/${folder}`);

  const entries = await vfs.list(`/${folder}`);
  const taken = new Set(entries.map((entry) => entry.path));

  return uniqueIngestPath(folder, createIngestSlug(title), taken);
}

export async function ingest(input: unknown): Promise<IngestResult> {
  const parsed = ingestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid ingest request.",
    );
  }

  const data = parsed.data;

  if (data.kind === "text") {
    const path = await nextPath(data.folder, data.title);
    const content = formatDocument(data.title, data.content);
    await vfs.writeFile(path, content);

    return { path, title: data.title, characters: content.length };
  }

  let page: WebFetchResponse;

  try {
    page = await webFetch(data.url);
  } catch (error) {
    throw new ServiceError(
      502,
      error instanceof Error ? error.message : "Unable to fetch that URL.",
    );
  }

  const title = page.title.trim() || data.url;
  const path = await nextPath(data.folder, title);
  const content = formatDocument(title, page.content, data.url);
  await vfs.writeFile(path, content);

  return { path, title, characters: content.length };
}
