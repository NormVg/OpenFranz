const MAX_PATH_LENGTH = 1024;

export const VFS_ROOT_DIRECTORIES = ["arsenal", "tecniques"] as const;

export const VFS_ROOT_POLICY_MESSAGE =
  "Only the /arsenal and /tecniques folders are allowed at the root.";

export type VfsEntryType = "file" | "directory";

export function isAllowedRootDirectory(name: string): boolean {
  return (VFS_ROOT_DIRECTORIES as readonly string[]).includes(name);
}

/**
 * The root may contain exactly two directories and nothing else.
 * Paths below the first level are unrestricted.
 */
export function violatesRootPolicy(path: string, type: VfsEntryType): boolean {
  const normalized = normalizeVfsPath(path);
  if (isVfsRoot(normalized)) return false;
  if (parentVfsPath(normalized) !== "/") return false;

  return type !== "directory" || !isAllowedRootDirectory(vfsBasename(normalized));
}

export class VfsPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VfsPathError";
  }
}

export function normalizeVfsPath(input: string): string {
  if (typeof input !== "string") {
    throw new VfsPathError("A filesystem path must be a string.");
  }

  if (input.includes("\0")) {
    throw new VfsPathError("Filesystem paths cannot contain null bytes.");
  }

  const segments = input.replace(/\\/g, "/").split("/");
  const stack: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  const path = `/${stack.join("/")}`;
  if (path.length > MAX_PATH_LENGTH) {
    throw new VfsPathError(`Filesystem paths cannot exceed ${MAX_PATH_LENGTH} characters.`);
  }

  return path;
}

export function parentVfsPath(input: string): string {
  const path = normalizeVfsPath(input);
  if (path === "/") return "/";

  const separator = path.lastIndexOf("/");
  return separator <= 0 ? "/" : path.slice(0, separator);
}

export function vfsBasename(input: string): string {
  const path = normalizeVfsPath(input);
  if (path === "/") return "/";
  return path.slice(path.lastIndexOf("/") + 1);
}

export function joinVfsPath(parent: string, child: string): string {
  return normalizeVfsPath(`${normalizeVfsPath(parent)}/${child}`);
}

export function isVfsRoot(input: string): boolean {
  return normalizeVfsPath(input) === "/";
}
