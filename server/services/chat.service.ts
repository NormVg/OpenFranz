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

export function listChats(): Promise<ChatRecord[]> {
  return chatRepository.listAll();
}

export async function getChat(id: string | undefined): Promise<ChatRecord> {
  const chat = await chatRepository.findById(parseChatId(id));
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found." });
  }
  return chat;
}

export async function createChat(
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
  return chatRepository.create(userId, parsed.data.title);
}

export async function updateChat(
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

  const chat = await chatRepository.update(
    parseChatId(id),
    parsed.data as ChatPatch,
  );
  if (!chat) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found." });
  }
  return chat;
}

export async function deleteChat(id: string | undefined): Promise<void> {
  const deleted = await chatRepository.deleteById(parseChatId(id));
  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Chat not found." });
  }
}
