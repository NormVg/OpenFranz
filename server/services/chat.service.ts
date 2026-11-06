import type { ChatPatch, ChatRecord } from "~~/shared/types/chat";
import {
  chatIdSchema,
  createChatSchema,
  updateChatSchema,
} from "~~/shared/schemas/chat";
import * as chatRepository from "../repositories/chat.repository";

function parseChatId(id: string | undefined): string {
  const parsed = chatIdSchema.safeParse(id);
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid chat id." });
  }
  return parsed.data;
}

export function listChatsForUser(userId: string): Promise<ChatRecord[]> {
  return chatRepository.listByUser(userId);
}

export async function getChatForUser(
  userId: string,
  id: string | undefined,
): Promise<ChatRecord> {
  const chat = await chatRepository.findByIdForUser(parseChatId(id), userId);
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found." });
  }
  return chat;
}

export async function createChatForUser(
  userId: string,
  input: unknown,
): Promise<ChatRecord> {
  const parsed = createChatSchema.safeParse(input);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Invalid chat.",
    });
  }
  return chatRepository.createForUser(userId, parsed.data.title);
}

export async function updateChatForUser(
  userId: string,
  id: string | undefined,
  input: unknown,
): Promise<ChatRecord> {
  const parsed = updateChatSchema.safeParse(input);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? "Invalid chat update.",
    });
  }

  const chat = await chatRepository.updateForUser(
    parseChatId(id),
    userId,
    parsed.data as ChatPatch,
  );
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found." });
  }
  return chat;
}

export async function deleteChatForUser(
  userId: string,
  id: string | undefined,
): Promise<void> {
  const deleted = await chatRepository.deleteForUser(parseChatId(id), userId);
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found." });
  }
}
