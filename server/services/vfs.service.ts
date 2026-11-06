import { createError } from "h3";
import {
  isVfsRoot,
  normalizeVfsPath,
  parentVfsPath,
  vfsBasename,
} from "../../shared/utils/vfs-path";
import * as vfsRepository from "../repositories/vfs.repository";
import type { VfsNode } from "../db/schema/vfs";

export interface VfsEntry {
  path: string;
  name: string;
  type: "file" | "directory";
  size: number;
  updatedAt: string;
  meta: Record<string, unknown>;
}

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

export async function list(path: string): Promise<VfsEntry[]> {
  const normalized = normalizeVfsPath(path);
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

  const existing = await vfsRepository.findByPath(destination);
  if (existing) throw conflict(`${destination} already exists.`);

  await ensureDirectory(parentVfsPath(destination));

  const moved = await vfsRepository.moveSubtree(source, destination);
  if (!moved) throw new Error(`Unable to move ${source}.`);
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

export const vfs = {
  stat,
  list,
  readFile,
  writeFile,
  mkdir,
  remove,
  move,
  search,
};
