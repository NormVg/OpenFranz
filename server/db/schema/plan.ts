import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type {
  PlanPlatform,
  PlanStatus,
} from "../../../shared/utils/plan";
import type { PlannerItemRecord } from "../../../shared/types/plan";
import { scripts } from "./script";

/**
 * One planned piece of content: what to post, where, on which day, and
 * why that day works. Written by the user in the planner page or by the
 * agent through its planning tools.
 */
export const plannerItems = pgTable(
  "planner_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    platform: text("platform").$type<PlanPlatform>().notNull(),
    format: text("format").notNull().default(""),
    brand: text("brand").notNull().default(""),
    plannedDate: date("planned_date", { mode: "string" }).notNull(),
    plannedTime: text("planned_time").notNull().default(""),
    status: text("status").$type<PlanStatus>().notNull().default("planned"),
    rationale: text("rationale").notNull().default(""),
    scriptId: uuid("script_id").references(() => scripts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("planner_items_date_idx").on(table.plannedDate)],
);

export type PlannerItemRow = typeof plannerItems.$inferSelect;

export function toPlannerItemRecord(row: PlannerItemRow): PlannerItemRecord {
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    format: row.format,
    brand: row.brand,
    plannedDate: row.plannedDate,
    plannedTime: row.plannedTime,
    status: row.status,
    rationale: row.rationale,
    scriptId: row.scriptId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
