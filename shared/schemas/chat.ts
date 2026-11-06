import { z } from "zod";

export const DEFAULT_CHAT_TITLE = "New chat";

export const chatIdSchema = z.string().uuid();

export const chatTitleSchema = z
  .string()
  .trim()
  .min(1, "A chat title is required.")
  .max(72, "Chat titles must be 72 characters or fewer.");

export const createChatSchema = z.object({
  title: chatTitleSchema.default(DEFAULT_CHAT_TITLE),
});

export const updateChatSchema = z
  .object({
    title: chatTitleSchema.optional(),
    session: z.unknown().optional(),
    events: z.array(z.unknown()).max(5000).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one chat field is required.",
  });
