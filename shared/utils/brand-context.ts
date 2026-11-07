export type BrandContext = {
  slug: string;
  name: string;
  product?: string | null;
};

const BRAND_CONTEXT_PATTERN =
  /^\[\[brand:([a-z0-9-]+)(?:\|([^|\]]+))?(?:\|([^|\]]+))?\]\]\s*/;

function sanitizeName(name: string): string {
  return name.replace(/[\]|]/g, "").trim();
}

export function withBrandContext(text: string, brand: BrandContext): string {
  const name = sanitizeName(brand.name);
  const product = brand.product ? sanitizeName(brand.product) : "";
  const marker = product
    ? `[[brand:${brand.slug}|${name}|${product}]]`
    : `[[brand:${brand.slug}|${name}]]`;

  return text ? `${marker} ${text}` : marker;
}

export function parseBrandContext(text: string): {
  slug: string | null;
  name: string | null;
  product: string | null;
  text: string;
} {
  const match = text.match(BRAND_CONTEXT_PATTERN);

  if (!match) {
    return { slug: null, name: null, product: null, text };
  }

  return {
    slug: match[1] ?? null,
    name: match[2] ?? null,
    product: match[3] ?? null,
    text: text.slice(match[0].length),
  };
}
