export interface VfsEntry {
  path: string;
  name: string;
  type: "file" | "directory";
  size: number;
  updatedAt: string;
  meta: Record<string, unknown>;
}

export interface VfsLinkInfo {
  sourcePath: string;
  targetPath: string;
  kind: string;
}

export interface VfsGraph {
  nodes: VfsEntry[];
  edges: VfsLinkInfo[];
}
