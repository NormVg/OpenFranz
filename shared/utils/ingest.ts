const MAX_SLUG_LENGTH = 80;

export function createIngestSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "note";
}

export function uniqueIngestPath(
  folder: string,
  slug: string,
  taken: Iterable<string>,
): string {
  const used = new Set(taken);
  const base = `/${folder}/${slug}`;

  if (!used.has(`${base}.md`)) return `${base}.md`;

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}.md`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}.md`;
}
