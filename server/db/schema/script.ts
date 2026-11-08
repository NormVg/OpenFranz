import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  ScriptRecord,
  ScriptVersionRecord,
  ScriptVersionSource,
} from "../../../shared/types/script";

/**
 * Scripts are the deliverables the agent writes in chat and the library
 * keeps. The row holds the current display state; every save appends an
 * immutable version row, so restoring is just another save.
 */
export const scripts = pgTable(
  "scripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    brand: text("brand").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("scripts_updated_idx").on(table.updatedAt)],
);

export const scriptVersions = pgTable(
  "script_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scriptId: uuid("script_id")
      .notNull()
      .references(() => scripts.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    brand: text("brand").notNull().default(""),
    content: text("content").notNull(),
    note: text("note").notNull().default(""),
    source: text("source").$type<ScriptVersionSource>().notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("script_versions_script_version_key").on(
      table.scriptId,
      table.versionNumber,
    ),
    index("script_versions_script_idx").on(table.scriptId, table.versionNumber),
  ],
);

export type ScriptRow = typeof scripts.$inferSelect;
export type ScriptVersionRow = typeof scriptVersions.$inferSelect;

export function toScriptRecord(
  row: ScriptRow,
  versionCount: number,
): ScriptRecord {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    brand: row.brand,
    versionCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toScriptVersionRecord(
  row: ScriptVersionRow,
): ScriptVersionRecord {
  return {
    id: row.id,
    scriptId: row.scriptId,
    versionNumber: row.versionNumber,
    title: row.title,
    brand: row.brand,
    content: row.content,
    note: row.note,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}
