import {
  joinVfsPath,
  normalizeVfsPath,
  parentVfsPath,
} from "./vfs-path";

export type VfsLinkKind = "wiki" | "markdown";

export interface VfsLinkReference {
  target: string;
  kind: VfsLinkKind;
}

const WIKI_LINK = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function isExternalTarget(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target);
}

export function extractVfsLinks(content: string): VfsLinkReference[] {
  const links = new Map<string, VfsLinkReference>();

  for (const match of content.matchAll(WIKI_LINK)) {
    const target = match[1]?.trim();
    if (!target || isExternalTarget(target)) continue;
    links.set(`wiki:${target}`, { target, kind: "wiki" });
  }

  for (const match of content.matchAll(MARKDOWN_LINK)) {
    if (match.index !== undefined && content[match.index - 1] === "!") continue;

    const target = match[1]?.trim();
    if (!target || isExternalTarget(target)) continue;
    links.set(`markdown:${target}`, { target, kind: "markdown" });
  }

  return [...links.values()];
}

export function resolveVfsLink(
  sourcePath: string,
  target: string,
): string | null {
  const raw = target.trim();
  if (!raw || isExternalTarget(raw)) return null;

  const withoutFragment = raw.split("#")[0]?.split("?")[0]?.trim();
  if (!withoutFragment) return null;

  let decoded = withoutFragment;
  try {
    decoded = decodeURIComponent(withoutFragment);
  } catch {
    decoded = withoutFragment;
  }

  return decoded.startsWith("/")
    ? normalizeVfsPath(decoded)
    : joinVfsPath(parentVfsPath(sourcePath), decoded);
}
