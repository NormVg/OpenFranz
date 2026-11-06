import type { ChatPatch, ChatRecord } from "~~/shared/types/chat";

export const chatService = {
  list(): Promise<ChatRecord[]> {
    return $fetch<ChatRecord[]>("/api/chats");
  },

  get(id: string): Promise<ChatRecord> {
    return $fetch<ChatRecord>(`/api/chats/${id}`);
  },

  create(title: string): Promise<ChatRecord> {
    return $fetch<ChatRecord>("/api/chats", {
      method: "POST",
      body: { title },
    });
  },

  update(id: string, patch: ChatPatch): Promise<ChatRecord> {
    return $fetch<ChatRecord>(`/api/chats/${id}`, {
      method: "PATCH",
      body: patch,
    });
  },

  remove(id: string): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>(`/api/chats/${id}`, {
      method: "DELETE",
    });
  },
};
