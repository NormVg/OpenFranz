import { desc, eq, sql } from "drizzle-orm";
import type {
  IngestJobRecord,
  IngestPipelineResult,
} from "../../shared/types/ingest-pipeline";
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

/**
 * Atomically claims the oldest queued job. `for update skip locked` lets more
 * than one worker poll the same table without processing the same job twice.
 */
export async function claimNext(): Promise<IngestJobRecord | null> {
  const [row] = await getDatabase()
    .update(ingestJobs)
    .set({
      status: "processing",
      attempts: sql`${ingestJobs.attempts} + 1`,
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      sql`${ingestJobs.id} = (
        select id from ingest_jobs
        where status = 'queued'
        order by created_at
        limit 1
        for update skip locked
      )`,
    )
    .returning();

  return row ? toRecord(row) : null;
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

/**
 * Returns jobs abandoned by a crashed worker to the queue. Called on worker
 * startup so a restart does not strand a job in `processing`.
 */
export async function requeueStale(): Promise<void> {
  await getDatabase()
    .update(ingestJobs)
    .set({ status: "queued", updatedAt: new Date() })
    .where(
      sql`${ingestJobs.status} = 'processing'
        and ${ingestJobs.attempts} < 3
        and ${ingestJobs.updatedAt} < now() - interval '15 minutes'`,
    );
}

export async function listRecent(limit = 20): Promise<IngestJobRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(ingestJobs)
    .orderBy(desc(ingestJobs.createdAt))
    .limit(limit);

  return rows.map(toRecord);
}
