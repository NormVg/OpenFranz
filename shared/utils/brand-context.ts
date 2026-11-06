export type BrandContext = {
  slug: string;
  name: string;
};

const BRAND_CONTEXT_PATTERN =
  /^\[\[brand:([a-z0-9-]+)(?:\|([^\]]+))?\]\]\s*/;

function sanitizeName(name: string): string {
  return name.replace(/[\]|]/g, "").trim();
}

export function withBrandContext(text: string, brand: BrandContext): string {
  const marker = `[[brand:${brand.slug}|${sanitizeName(brand.name)}]]`;
  return text ? `${marker} ${text}` : marker;
}

export function parseBrandContext(text: string): {
  slug: string | null;
  name: string | null;
  text: string;
} {
  const match = text.match(BRAND_CONTEXT_PATTERN);

  if (!match) {
    return { slug: null, name: null, text };
  }

  return {
    slug: match[1] ?? null,
    name: match[2] ?? null,
    text: text.slice(match[0].length),
  };
}
