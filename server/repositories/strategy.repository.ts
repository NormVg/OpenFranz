import { desc, eq } from "drizzle-orm";
import type { StrategyRecord } from "../../shared/types/strategy";
import { getDatabase } from "../db/client";
import { strategies, toStrategyRecord } from "../db/schema/strategy";

export type StrategyValues = {
  title: string;
  content: string;
  isActive: boolean;
};

export async function listAll(): Promise<StrategyRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(strategies)
    .orderBy(desc(strategies.updatedAt));

  return rows.map(toStrategyRecord);
}

export async function findById(
  id: string,
): Promise<StrategyRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(strategies)
    .where(eq(strategies.id, id))
    .limit(1);

  return row ? toStrategyRecord(row) : null;
}

export async function findActive(): Promise<StrategyRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(strategies)
    .where(eq(strategies.isActive, true))
    .orderBy(desc(strategies.updatedAt))
    .limit(1);

  return row ? toStrategyRecord(row) : null;
}

export async function countActive(): Promise<number> {
  const rows = await getDatabase()
    .select({ id: strategies.id })
    .from(strategies)
    .where(eq(strategies.isActive, true));

  return rows.length;
}

export async function create(
  values: StrategyValues,
): Promise<StrategyRecord> {
  const [row] = await getDatabase()
    .insert(strategies)
    .values(values)
    .returning();

  if (!row) throw new Error("The strategy could not be created.");
  return toStrategyRecord(row);
}

export async function update(
  id: string,
  values: Partial<StrategyValues>,
): Promise<StrategyRecord | null> {
  const [row] = await getDatabase()
    .update(strategies)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(strategies.id, id))
    .returning();

  return row ? toStrategyRecord(row) : null;
}

export async function deactivateAll(): Promise<void> {
  await getDatabase()
    .update(strategies)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(strategies.isActive, true));
}

export async function deleteById(id: string): Promise<boolean> {
  const [row] = await getDatabase()
    .delete(strategies)
    .where(eq(strategies.id, id))
    .returning({ id: strategies.id });

  return Boolean(row);
}
