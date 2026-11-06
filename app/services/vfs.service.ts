import type {
  VfsEntry,
  VfsGraph,
  VfsLinkInfo,
} from "~~/shared/types/vfs";

export const vfsService = {
  list(path = "/"): Promise<VfsEntry[]> {
    return $fetch<VfsEntry[]>("/api/vfs", { query: { path } });
  },

  readFile(path: string): Promise<{ content: string }> {
    return $fetch<{ content: string }>("/api/vfs/file", { query: { path } });
  },

  graph(): Promise<VfsGraph> {
    return $fetch<VfsGraph>("/api/vfs/graph");
  },

  find(query: string, limit = 20): Promise<VfsEntry[]> {
    return $fetch<VfsEntry[]>("/api/vfs/find", {
      query: { q: query, limit },
    });
  },

  links(path: string): Promise<{
    outgoing: VfsLinkInfo[];
    backlinks: VfsLinkInfo[];
  }> {
    return $fetch<{
      outgoing: VfsLinkInfo[];
      backlinks: VfsLinkInfo[];
    }>("/api/vfs/links", { query: { path } });
  },

  reindex(): Promise<{ indexed: number }> {
    return $fetch<{ indexed: number }>("/api/vfs/reindex", {
      method: "POST",
    });
  },
};
