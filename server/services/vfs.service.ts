import { createError } from "h3";
import {
  isAllowedRootDirectory,
  isVfsRoot,
  normalizeVfsPath,
  parentVfsPath,
  VFS_ROOT_DIRECTORIES,
  vfsBasename,
} from "../../shared/utils/vfs-path";
import {
  extractVfsLinks,
  resolveVfsLink,
  type VfsLinkKind,
} from "../../shared/utils/vfs-links";
import { rankVfsPaths } from "../../shared/utils/vfs-fuzzy";
import type {
  VfsEntry,
  VfsGraph,
  VfsLinkInfo,
} from "../../shared/types/vfs";
import * as vfsRepository from "../repositories/vfs.repository";
import * as vfsLinkRepository from "../repositories/vfs-link.repository";
import type { VfsLink, VfsNode } from "../db/schema/vfs";

function toEntry(node: VfsNode): VfsEntry {
  return {
    path: node.path,
    name: node.name,
    type: node.type === "dir" ? "directory" : "file",
    size: node.size,
    updatedAt: node.updatedAt.toISOString(),
    meta: node.meta,
  };
}

function toLinkInfo(link: VfsLink): VfsLinkInfo {
  return {
    sourcePath: link.sourcePath,
    targetPath: link.targetPath,
    kind: link.kind,
  };
}

async function syncLinksForPath(path: string): Promise<void> {
  const node = await vfsRepository.findByPath(path);

  if (!node || node.type !== "file" || !node.content) {
    await vfsLinkRepository.replaceLinksForSource(path, []);
    return;
  }

  const targets = new Map<string, VfsLinkKind>();
  for (const reference of extractVfsLinks(node.content)) {
    const target = resolveVfsLink(path, reference.target);
    if (target) targets.set(target, reference.kind);
  }

  await vfsLinkRepository.replaceLinksForSource(
    path,
    [...targets].map(([targetPath, kind]) => ({ targetPath, kind })),
  );
}

function notFound(path: string) {
  return createError({
    statusCode: 404,
    statusMessage: `Filesystem path not found: ${path}`,
  });
}

function conflict(message: string) {
  return createError({ statusCode: 409, statusMessage: message });
}

async function ensureDirectory(path: string): Promise<VfsNode> {
  const normalized = normalizeVfsPath(path);

  if (
    normalized !== "/" &&
    parentVfsPath(normalized) === "/" &&
    !isAllowedRootDirectory(vfsBasename(normalized))
  ) {
    throw conflict(
      "Only /arsenal and /tecniques are allowed as root folders.",
    );
  }

  const existing = await vfsRepository.findByPath(normalized);

  if (existing) {
    if (existing.type !== "dir") {
      throw conflict(`${normalized} is not a directory.`);
    }
    return existing;
  }

  if (normalized === "/") {
    return vfsRepository.insertNode({
      path: "/",
      parentPath: "/",
      name: "/",
      type: "dir",
      content: null,
      meta: {},
      size: 0,
    });
  }

  const parent = parentVfsPath(normalized);
  await ensureDirectory(parent);

  return vfsRepository.insertNode({
    path: normalized,
    parentPath: parent,
    name: vfsBasename(normalized),
    type: "dir",
    content: null,
    meta: {},
    size: 0,
  });
}

export async function stat(path: string): Promise<VfsEntry | null> {
  const node = await vfsRepository.findByPath(normalizeVfsPath(path));
  return node ? toEntry(node) : null;
}

async function ensureRootLayout(): Promise<void> {
  for (const name of VFS_ROOT_DIRECTORIES) {
    await ensureDirectory(`/${name}`);
  }
}

export async function list(path: string): Promise<VfsEntry[]> {
  const normalized = normalizeVfsPath(path);
  if (normalized === "/") await ensureRootLayout();

  const node = await vfsRepository.findByPath(normalized);

  if (!node) throw notFound(normalized);
  if (node.type !== "dir") {
    throw conflict(`${normalized} is not a directory.`);
  }

  const children = await vfsRepository.listChildren(normalized);
  return children.map(toEntry);
}

export async function readFile(path: string): Promise<string> {
  const normalized = normalizeVfsPath(path);
  const node = await vfsRepository.findByPath(normalized);

  if (!node) throw notFound(normalized);
  if (node.type === "dir") {
    throw conflict(`${normalized} is a directory.`);
  }

  return node.content ?? "";
}

export async function writeFile(
  path: string,
  content: string,
  meta: Record<string, unknown> = {},
): Promise<VfsEntry> {
  const normalized = normalizeVfsPath(path);
  if (isVfsRoot(normalized)) {
    throw createError({
      statusCode: 400,
      statusMessage: "The root path cannot be written as a file.",
    });
  }

  const parent = parentVfsPath(normalized);
  await ensureDirectory(parent);

  const existing = await vfsRepository.findByPath(normalized);
  if (existing?.type === "dir") {
    throw conflict(`${normalized} is a directory.`);
  }

  const values = {
    path: normalized,
    parentPath: parent,
    name: vfsBasename(normalized),
    type: "file",
    content,
    meta: Object.keys(meta).length > 0 ? meta : (existing?.meta ?? {}),
    size: Buffer.byteLength(content, "utf8"),
    updatedAt: new Date(),
  };

  const node = existing
    ? await vfsRepository.updateNode(normalized, values)
    : await vfsRepository.insertNode(values);

  if (!node) throw new Error(`Unable to write ${normalized}.`);
  await syncLinksForPath(normalized);
  return toEntry(node);
}

export async function mkdir(
  path: string,
  meta: Record<string, unknown> = {},
): Promise<VfsEntry> {
  const node = await ensureDirectory(path);

  if (Object.keys(meta).length > 0) {
    const updated = await vfsRepository.updateNode(node.path, { meta });
    if (updated) return toEntry(updated);
  }

  return toEntry(node);
}

export async function remove(
  path: string,
  options: { recursive?: boolean } = {},
): Promise<boolean> {
  const normalized = normalizeVfsPath(path);
  if (isVfsRoot(normalized)) {
    throw createError({
      statusCode: 400,
      statusMessage: "The root path cannot be removed.",
    });
  }

  if (
    parentVfsPath(normalized) === "/" &&
    isAllowedRootDirectory(vfsBasename(normalized))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "The root folders cannot be removed.",
    });
  }

  const node = await vfsRepository.findByPath(normalized);
  if (!node) return false;

  if (node.type === "dir" && !options.recursive) {
    const children = await vfsRepository.countChildren(normalized);
    if (children > 0) {
      throw conflict(`${normalized} is not empty.`);
    }
  }

  return options.recursive
    ? vfsRepository.deleteSubtree(normalized)
    : vfsRepository.deleteNode(normalized);
}

export async function move(from: string, to: string): Promise<VfsEntry> {
  const source = normalizeVfsPath(from);
  const destination = normalizeVfsPath(to);

  if (isVfsRoot(source) || isVfsRoot(destination)) {
    throw createError({
      statusCode: 400,
      statusMessage: "The root path cannot be moved.",
    });
  }

  const node = await vfsRepository.findByPath(source);
  if (!node) throw notFound(source);

  if (
    node.type === "dir" &&
    parentVfsPath(source) === "/" &&
    isAllowedRootDirectory(vfsBasename(source))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "The root folders cannot be moved.",
    });
  }

  if (
    node.type === "dir" &&
    parentVfsPath(destination) === "/" &&
    !isAllowedRootDirectory(vfsBasename(destination))
  ) {
    throw conflict(
      "Only /arsenal and /tecniques are allowed as root folders.",
    );
  }

  const existing = await vfsRepository.findByPath(destination);
  if (existing) throw conflict(`${destination} already exists.`);

  await ensureDirectory(parentVfsPath(destination));

  const moved = await vfsRepository.moveSubtree(source, destination);
  if (!moved) throw new Error(`Unable to move ${source}.`);
  await vfsLinkRepository.retargetLinks(source, destination);
  return toEntry(moved);
}

export async function search(
  query: string,
  limit = 20,
): Promise<VfsEntry[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const escaped = normalized.replace(/[\\%_]/g, "\\$&");
  const nodes = await vfsRepository.searchNodes(
    escaped,
    Math.min(Math.max(limit, 1), 100),
  );

  return nodes.map(toEntry);
}

export async function find(
  query: string,
  limit = 20,
): Promise<VfsEntry[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const nodes = await vfsRepository.listAllNodes();
  const ranked = rankVfsPaths(
    normalized,
    nodes.map((node) => node.path),
    limit,
  );
  const byPath = new Map(nodes.map((node) => [node.path, node]));

  return ranked
    .map((match) => byPath.get(match.path))
    .filter((node): node is VfsNode => Boolean(node))
    .map(toEntry);
}

export async function links(path: string): Promise<{
  outgoing: VfsLinkInfo[];
  backlinks: VfsLinkInfo[];
}> {
  const normalized = normalizeVfsPath(path);
  const node = await vfsRepository.findByPath(normalized);
  if (!node) throw notFound(normalized);

  const [outgoing, backlinks] = await Promise.all([
    vfsLinkRepository.listLinksFrom(normalized),
    vfsLinkRepository.listLinksTo(normalized),
  ]);

  return {
    outgoing: outgoing.map(toLinkInfo),
    backlinks: backlinks.map(toLinkInfo),
  };
}

export async function related(
  path: string,
  depth = 1,
): Promise<VfsEntry[]> {
  const normalized = normalizeVfsPath(path);
  const node = await vfsRepository.findByPath(normalized);
  if (!node) throw notFound(normalized);

  const allLinks = await vfsLinkRepository.listAllLinks();
  const adjacency = new Map<string, Set<string>>();

  for (const link of allLinks) {
    if (!adjacency.has(link.sourcePath)) adjacency.set(link.sourcePath, new Set());
    if (!adjacency.has(link.targetPath)) adjacency.set(link.targetPath, new Set());
    adjacency.get(link.sourcePath)?.add(link.targetPath);
    adjacency.get(link.targetPath)?.add(link.sourcePath);
  }

  const visited = new Set<string>([normalized]);
  let frontier = [normalized];
  const maxDepth = Math.min(Math.max(depth, 1), 5);

  for (let level = 0; level < maxDepth; level += 1) {
    const next: string[] = [];

    for (const current of frontier) {
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        next.push(neighbor);
      }
    }

    frontier = next;
    if (frontier.length === 0) break;
  }

  visited.delete(normalized);
  const nodes = await vfsRepository.findByPaths([...visited]);
  return nodes
    .map(toEntry)
    .sort((left, right) => left.path.localeCompare(right.path));
}

export async function pathBetween(
  from: string,
  to: string,
): Promise<string[] | null> {
  const source = normalizeVfsPath(from);
  const destination = normalizeVfsPath(to);

  if (source === destination) return [source];

  const allLinks = await vfsLinkRepository.listAllLinks();
  const adjacency = new Map<string, string[]>();

  for (const link of allLinks) {
    const neighbors = adjacency.get(link.sourcePath) ?? [];
    neighbors.push(link.targetPath);
    adjacency.set(link.sourcePath, neighbors);
  }

  const queue: string[][] = [[source]];
  const visited = new Set<string>([source]);

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;
    const current = path[path.length - 1];
    if (!current) continue;

    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === destination) return [...path, neighbor];
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push([...path, neighbor]);
    }
  }

  return null;
}

export async function graph(): Promise<VfsGraph> {
  await ensureRootLayout();

  const [nodes, edges] = await Promise.all([
    vfsRepository.listAllNodes(),
    vfsLinkRepository.listAllLinks(),
  ]);

  return {
    nodes: nodes.map(toEntry),
    edges: edges.map(toLinkInfo),
  };
}

export async function reindexLinks(): Promise<number> {
  const nodes = await vfsRepository.listAllNodes();
  const files = nodes.filter((node) => node.type === "file");

  for (const file of files) {
    await syncLinksForPath(file.path);
  }

  return files.length;
}

export const vfs = {
  stat,
  list,
  readFile,
  writeFile,
  mkdir,
  remove,
  move,
  search,
  find,
  links,
  related,
  pathBetween,
  graph,
  reindexLinks,
};
