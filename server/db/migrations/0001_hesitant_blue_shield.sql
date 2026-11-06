CREATE TABLE IF NOT EXISTS "vfs_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"target_path" text NOT NULL,
	"kind" text DEFAULT 'reference' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vfs_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"parent_path" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"content" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_tsv" "tsvector",
	CONSTRAINT "vfs_nodes_path_unique" UNIQUE("path")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vfs_links_source_path_vfs_nodes_path_fk'
  ) THEN
    ALTER TABLE "vfs_links" ADD CONSTRAINT "vfs_links_source_path_vfs_nodes_path_fk" FOREIGN KEY ("source_path") REFERENCES "public"."vfs_nodes"("path") ON DELETE cascade ON UPDATE cascade;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vfs_links_source_target_idx" ON "vfs_links" USING btree ("source_path","target_path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vfs_links_target_path_idx" ON "vfs_links" USING btree ("target_path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vfs_nodes_parent_path_idx" ON "vfs_nodes" USING btree ("parent_path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vfs_nodes_type_idx" ON "vfs_nodes" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vfs_nodes_search_tsv_idx" ON "vfs_nodes" USING gin ("search_tsv");
