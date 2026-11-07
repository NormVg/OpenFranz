import type { BrandProduct } from "../../../shared/types/brand";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    summary: text("summary").notNull().default(""),
    website: text("website").notNull().default(""),
    audience: text("audience").notNull().default(""),
    tone: text("tone").notNull().default(""),
    products: jsonb("products").$type<BrandProduct[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("brands_updated_idx").on(table.updatedAt)],
);
