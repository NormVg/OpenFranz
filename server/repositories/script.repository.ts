import { desc, eq, sql } from "drizzle-orm";
import type {
  ScriptRecord,
  ScriptVersionRecord,
  ScriptVersionSource,
} from "../../shared/types/script";
import { getDatabase } from "../db/client";
import {
  scriptVersions,
  scripts,
  toScriptRecord,
  toScriptVersionRecord,
} from "../db/schema/script";

export type ScriptValues = {
  title: string;
  slug: string;
  brand: string;
};

export type ScriptVersionValues = {
  title: string;
  brand: string;
  content: string;
  note: string;
  source: ScriptVersionSource;
};

export async function listAll(): Promise<ScriptRecord[]> {
  const rows = await withVersionCount().orderBy(desc(scripts.updatedAt));
  return rows.map((row) => toScriptRecord(row.script, row.versionCount));
}

export async function findById(id: string): Promise<ScriptRecord | null> {
  const [row] = await withVersionCount().where(eq(scripts.id, id)).limit(1);
  return row ? toScriptRecord(row.script, row.versionCount) : null;
}

export async function findBySlug(slug: string): Promise<ScriptRecord | null> {
  const [row] = await withVersionCount()
    .where(eq(scripts.slug, slug))
    .limit(1);
  return row ? toScriptRecord(row.script, row.versionCount) : null;
}

/**
 * Groups scripts with their version count. The count lives in a join, not a
 * correlated subquery: drizzle renders interpolated columns inside a
 * select-field subquery without table qualification, which silently
 * rebinds the correlation to the version table itself.
 */
function withVersionCount() {
  return getDatabase()
    .select({
      script: scripts,
      versionCount: sql<number>`count(${scriptVersions.id})::int`.as(
        "version_count",
      ),
    })
    .from(scripts)
    .leftJoin(scriptVersions, eq(scriptVersions.scriptId, scripts.id))
    .groupBy(scripts.id);
}

export async function listSlugs(): Promise<string[]> {
  const rows = await getDatabase().select({ slug: scripts.slug }).from(scripts);
  return rows.map((row) => row.slug);
}

export async function create(values: ScriptValues): Promise<ScriptRecord> {
  const [row] = await getDatabase().insert(scripts).values(values).returning();

  if (!row) throw new Error("The script could not be created.");
  return toScriptRecord(row, 0);
}

export async function updateFields(
  id: string,
  values: Partial<Pick<ScriptValues, "title" | "brand">>,
): Promise<void> {
  await getDatabase()
    .update(scripts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(scripts.id, id));
}

/**
 * Appends one immutable version. The next number is computed inside the
 * insert, so two concurrent saves cannot take the same slot; the unique
 * (script_id, version_number) constraint is the last line of defense.
 */
export async function insertVersion(
  scriptId: string,
  values: ScriptVersionValues,
): Promise<ScriptVersionRecord> {
  const [row] = await getDatabase()
    .insert(scriptVersions)
    .values({
      scriptId,
      title: values.title,
      brand: values.brand,
      content: values.content,
      note: values.note,
      source: values.source,
      versionNumber:
        sql`(select coalesce(max(${scriptVersions.versionNumber}), 0) + 1 from ${scriptVersions} where ${scriptVersions.scriptId} = ${scriptId})`,
    })
    .returning();

  if (!row) throw new Error("The script version could not be saved.");
  return toScriptVersionRecord(row);
}

export async function listVersions(
  scriptId: string,
): Promise<ScriptVersionRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(scriptVersions)
    .where(eq(scriptVersions.scriptId, scriptId))
    .orderBy(desc(scriptVersions.versionNumber));

  return rows.map(toScriptVersionRecord);
}

export async function findVersion(
  scriptId: string,
  versionNumber: number,
): Promise<ScriptVersionRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(scriptVersions)
    .where(
      sql`${scriptVersions.scriptId} = ${scriptId} and ${scriptVersions.versionNumber} = ${versionNumber}`,
    )
    .limit(1);

  return row ? toScriptVersionRecord(row) : null;
}

export async function deleteById(id: string): Promise<boolean> {
  const [row] = await getDatabase()
    .delete(scripts)
    .where(eq(scripts.id, id))
    .returning({ id: scripts.id });

  return Boolean(row);
}
