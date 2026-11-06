DROP INDEX "chats_user_updated_idx";--> statement-breakpoint
CREATE INDEX "chats_updated_idx" ON "chats" USING btree ("updated_at");