import { z } from "zod";

export const INGEST_FOLDERS = ["arsenal", "knowledge"] as const;

export const ingestFolderSchema = z.enum(INGEST_FOLDERS);

export const ingestTextSchema = z.object({
  kind: z.literal("text"),
  title: z.string().trim().min(1, "A title is required.").max(120),
  content: z.string().trim().min(1, "Content is required.").max(200_000),
  folder: ingestFolderSchema.default("arsenal"),
});

export const ingestUrlSchema = z.object({
  kind: z.literal("url"),
  url: z.url("A valid URL is required."),
  folder: ingestFolderSchema.default("arsenal"),
});

export const ingestSchema = z.discriminatedUnion("kind", [
  ingestTextSchema,
  ingestUrlSchema,
]);
