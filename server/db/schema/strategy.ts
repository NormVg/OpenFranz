import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { StrategyRecord } from "../../../shared/types/strategy";

/**
 * A strategy defines how content gets planned: cadence, platforms, priorities,
 * and constraints. Exactly one strategy is active at a time; the agent reads
 * it before proposing or writing plan items.
 */
export const strategies = pgTable(
  "strategies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("strategies_updated_idx").on(table.updatedAt)],
);

export type StrategyRow = typeof strategies.$inferSelect;

export function toStrategyRecord(row: StrategyRow): StrategyRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
