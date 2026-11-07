import type { IngestPipelineResult } from "~~/shared/types/ingest-pipeline";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const ingestJobs = pgTable(
  "ingest_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull().default("instagram"),
    sourceUrl: text("source_url").notNull(),
    status: text("status").notNull().default("queued"),
    result: jsonb("result").$type<IngestPipelineResult>(),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("ingest_jobs_status_created_idx").on(table.status, table.createdAt)],
);
