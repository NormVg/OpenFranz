import { desc, eq } from "drizzle-orm";
import type { BrandProduct, BrandRecord } from "../../shared/types/brand";
import { getDatabase } from "../db/client";
import { brands } from "../db/schema";

type BrandRow = typeof brands.$inferSelect;

export type BrandValues = {
  name: string;
  slug: string;
  summary: string;
  website: string;
  audience: string;
  tone: string;
  products: BrandProduct[];
  notes: string;
};

function toRecord(row: BrandRow): BrandRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary,
    website: row.website,
    audience: row.audience,
    tone: row.tone,
    products: row.products,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAll(): Promise<BrandRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(brands)
    .orderBy(desc(brands.updatedAt));

  return rows.map(toRecord);
}

export async function findById(id: string): Promise<BrandRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(brands)
    .where(eq(brands.id, id))
    .limit(1);

  return row ? toRecord(row) : null;
}

export async function findBySlug(slug: string): Promise<BrandRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(brands)
    .where(eq(brands.slug, slug))
    .limit(1);

  return row ? toRecord(row) : null;
}

export async function listSlugs(): Promise<string[]> {
  const rows = await getDatabase().select({ slug: brands.slug }).from(brands);
  return rows.map((row) => row.slug);
}

export async function create(values: BrandValues): Promise<BrandRecord> {
  const [row] = await getDatabase().insert(brands).values(values).returning();

  if (!row) throw new Error("The brand could not be created.");
  return toRecord(row);
}

export async function update(
  id: string,
  values: Partial<BrandValues>,
): Promise<BrandRecord | null> {
  const [row] = await getDatabase()
    .update(brands)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(brands.id, id))
    .returning();

  return row ? toRecord(row) : null;
}

export async function deleteById(id: string): Promise<boolean> {
  const [row] = await getDatabase()
    .delete(brands)
    .where(eq(brands.id, id))
    .returning({ id: brands.id });

  return Boolean(row);
}
