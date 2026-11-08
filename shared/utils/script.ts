const MAX_SLUG_LENGTH = 80;

export function createScriptSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "script";
}

export function uniqueScriptSlug(
  base: string,
  taken: Iterable<string>,
): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}
