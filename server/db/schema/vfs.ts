import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

// Existing database table used as the agent's virtual filesystem.
export const vfsNodes = pgTable(
  "vfs_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: text("path").notNull().unique(),
    parentPath: text("parent_path").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    content: text("content"),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
    size: integer("size").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    searchTsv: tsvector("search_tsv"),
  },
  (table) => [
    index("vfs_nodes_parent_path_idx").on(table.parentPath),
    index("vfs_nodes_type_idx").on(table.type),
    index("vfs_nodes_search_tsv_idx").using("gin", table.searchTsv),
  ],
);

export type VfsNode = typeof vfsNodes.$inferSelect;
export type NewVfsNode = typeof vfsNodes.$inferInsert;
