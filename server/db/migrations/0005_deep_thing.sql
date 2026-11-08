CREATE TABLE "planner_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"platform" text NOT NULL,
	"format" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"planned_date" date NOT NULL,
	"planned_time" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"script_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"script_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"content" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "script_versions_script_version_key" UNIQUE("script_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scripts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "planner_items" ADD CONSTRAINT "planner_items_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_versions" ADD CONSTRAINT "script_versions_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planner_items_date_idx" ON "planner_items" USING btree ("planned_date");--> statement-breakpoint
CREATE INDEX "script_versions_script_idx" ON "script_versions" USING btree ("script_id","version_number");--> statement-breakpoint
CREATE INDEX "scripts_updated_idx" ON "scripts" USING btree ("updated_at");