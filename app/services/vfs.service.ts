import type {
  VfsEntry,
  VfsGraph,
  VfsLinkInfo,
} from "~~/shared/types/vfs";
import {
  cachedResponse,
  invalidateResponseCache,
} from "~/utils/response-cache";

const LIST_TTL_MS = 15_000;
const SEARCH_TTL_MS = 30_000;

export const vfsService = {
  list(path = "/"): Promise<VfsEntry[]> {
    return cachedResponse(`vfs:list:${path}`, LIST_TTL_MS, () =>
      $fetch<VfsEntry[]>("/api/vfs", { query: { path } }),
    );
  },

  readFile(path: string): Promise<{ content: string }> {
    return cachedResponse(`vfs:file:${path}`, LIST_TTL_MS, () =>
      $fetch<{ content: string }>("/api/vfs/file", { query: { path } }),
    );
  },

  graph(): Promise<VfsGraph> {
    return cachedResponse("vfs:graph", LIST_TTL_MS, () =>
      $fetch<VfsGraph>("/api/vfs/graph"),
    );
  },

  find(query: string, limit = 20): Promise<VfsEntry[]> {
    return cachedResponse(`vfs:find:${query}:${limit}`, SEARCH_TTL_MS, () =>
      $fetch<VfsEntry[]>("/api/vfs/find", {
        query: { q: query, limit },
      }),
    );
  },

  links(path: string): Promise<{
    outgoing: VfsLinkInfo[];
    backlinks: VfsLinkInfo[];
  }> {
    return cachedResponse(`vfs:links:${path}`, LIST_TTL_MS, () =>
      $fetch<{
        outgoing: VfsLinkInfo[];
        backlinks: VfsLinkInfo[];
      }>("/api/vfs/links", { query: { path } }),
    );
  },

  async reindex(): Promise<{ indexed: number }> {
    const result = await $fetch<{ indexed: number }>("/api/vfs/reindex", {
      method: "POST",
    });
    invalidateResponseCache("vfs:");
    return result;
  },

  invalidate(): void {
    invalidateResponseCache("vfs:");
  },
};
