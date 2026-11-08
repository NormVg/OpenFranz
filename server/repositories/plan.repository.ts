import { asc, eq } from "drizzle-orm";
import type { PlannerItemRecord } from "../../shared/types/plan";
import { getDatabase } from "../db/client";
import { plannerItems, toPlannerItemRecord } from "../db/schema/plan";
import type { PlanPlatform, PlanStatus } from "../../shared/utils/plan";

export type PlannerItemValues = {
  title: string;
  platform: PlanPlatform;
  format: string;
  brand: string;
  plannedDate: string;
  plannedTime: string;
  status: PlanStatus;
  rationale: string;
  scriptId: string | null;
};

export async function listAll(): Promise<PlannerItemRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(plannerItems)
    .orderBy(asc(plannerItems.plannedDate), asc(plannerItems.createdAt));

  return rows.map(toPlannerItemRecord);
}

export async function findById(id: string): Promise<PlannerItemRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(plannerItems)
    .where(eq(plannerItems.id, id))
    .limit(1);

  return row ? toPlannerItemRecord(row) : null;
}

export async function create(
  values: PlannerItemValues,
): Promise<PlannerItemRecord> {
  const [row] = await getDatabase()
    .insert(plannerItems)
    .values(values)
    .returning();

  if (!row) throw new Error("The planned item could not be created.");
  return toPlannerItemRecord(row);
}

export async function update(
  id: string,
  values: Partial<PlannerItemValues>,
): Promise<PlannerItemRecord | null> {
  const [row] = await getDatabase()
    .update(plannerItems)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(plannerItems.id, id))
    .returning();

  return row ? toPlannerItemRecord(row) : null;
}

export async function deleteById(id: string): Promise<boolean> {
  const [row] = await getDatabase()
    .delete(plannerItems)
    .where(eq(plannerItems.id, id))
    .returning({ id: plannerItems.id });

  return Boolean(row);
}
