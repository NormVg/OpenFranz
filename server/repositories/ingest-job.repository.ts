import { desc, eq, sql } from "drizzle-orm";
import type {
  IngestJobRecord,
  IngestPipelineResult,
} from "~~/shared/types/ingest-pipeline";
import { getDatabase } from "../db/client";
import { ingestJobs } from "../db/schema";

type IngestJobRow = typeof ingestJobs.$inferSelect;

function toRecord(row: IngestJobRow): IngestJobRecord {
  return {
    id: row.id,
    kind: "instagram",
    sourceUrl: row.sourceUrl,
    status: row.status as IngestJobRecord["status"],
    result: row.result ?? null,
    error: row.error,
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

export async function create(sourceUrl: string): Promise<IngestJobRecord> {
  const [row] = await getDatabase()
    .insert(ingestJobs)
    .values({ sourceUrl })
    .returning();

  if (!row) throw new Error("The ingest job could not be created.");
  return toRecord(row);
}

export async function findById(id: string): Promise<IngestJobRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(ingestJobs)
    .where(eq(ingestJobs.id, id))
    .limit(1);

  return row ? toRecord(row) : null;
}

export async function markRunning(id: string): Promise<void> {
  await getDatabase()
    .update(ingestJobs)
    .set({
      status: "processing",
      attempts: sql`${ingestJobs.attempts} + 1`,
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ingestJobs.id, id));
}

export async function markCompleted(
  id: string,
  result: IngestPipelineResult,
): Promise<void> {
  await getDatabase()
    .update(ingestJobs)
    .set({
      status: "completed",
      result,
      error: null,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ingestJobs.id, id));
}

export async function markFailed(id: string, error: string): Promise<void> {
  await getDatabase()
    .update(ingestJobs)
    .set({
      status: "failed",
      error,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(ingestJobs.id, id));
}

export async function listRecent(limit = 20): Promise<IngestJobRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(ingestJobs)
    .orderBy(desc(ingestJobs.createdAt))
    .limit(limit);

  return rows.map(toRecord);
}
