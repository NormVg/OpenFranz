import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export const vfsLinks = pgTable(
  "vfs_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourcePath: text("source_path")
      .notNull()
      .references(() => vfsNodes.path, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    targetPath: text("target_path").notNull(),
    kind: text("kind").notNull().default("reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vfs_links_source_target_idx").on(table.sourcePath, table.targetPath),
    index("vfs_links_target_path_idx").on(table.targetPath),
  ],
);

export type VfsNode = typeof vfsNodes.$inferSelect;
export type NewVfsNode = typeof vfsNodes.$inferInsert;
export type VfsLink = typeof vfsLinks.$inferSelect;
export type NewVfsLink = typeof vfsLinks.$inferInsert;
