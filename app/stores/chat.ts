import { defineStore } from "pinia";
import type { ClientSessionState, SessionStreamEvent } from "eve/client";
import type { ChatPatch, ChatRecord } from "~~/shared/types/chat";
import { chatService } from "~/services/chat.service";

const ACTIVE_CHAT_KEY = "openfranz:active-chat";

function readActiveChatId(): string | null {
  if (!import.meta.client) return null;
  return window.localStorage.getItem(ACTIVE_CHAT_KEY);
}

function writeActiveChatId(id: string | null) {
  if (!import.meta.client) return;

  if (id) {
    window.localStorage.setItem(ACTIVE_CHAT_KEY, id);
  } else {
    window.localStorage.removeItem(ACTIVE_CHAT_KEY);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unable to load chats. Please try again.";
}

export const useChatStore = defineStore("chat", () => {
  const chats = shallowRef<ChatRecord[]>([]);
  const activeChatId = ref<string | null>(null);
  const initialSession = shallowRef<ClientSessionState | undefined>();
  const initialEvents = shallowRef<SessionStreamEvent[]>([]);
  const viewKey = ref(0);
  const hydrated = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function hydrate() {
    if (hydrated.value) return;

    loading.value = true;
    error.value = null;

    try {
      chats.value = await chatService.list();
      const savedId = readActiveChatId();
      const saved =
        chats.value.find((chat) => chat.id === savedId) ?? chats.value[0];

      if (saved) {
        activeChatId.value = saved.id;
        initialSession.value = saved.session;
        initialEvents.value = saved.events;
        viewKey.value += 1;
        writeActiveChatId(saved.id);
      }

      hydrated.value = true;
    } catch (cause) {
      error.value = errorMessage(cause);
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  function newChat() {
    activeChatId.value = null;
    initialSession.value = undefined;
    initialEvents.value = [];
    viewKey.value += 1;
    writeActiveChatId(null);
  }

  async function selectChat(id: string) {
    const chat = await chatService.get(id);

    activeChatId.value = chat.id;
    initialSession.value = chat.session;
    initialEvents.value = chat.events;
    viewKey.value += 1;
    writeActiveChatId(chat.id);
  }

  async function addChat(title: string) {
    const chat = await chatService.create(title);
    chats.value = [chat, ...chats.value];
    activeChatId.value = chat.id;
    writeActiveChatId(chat.id);
    return chat;
  }

  async function removeChat(id: string) {
    await chatService.remove(id);
    chats.value = chats.value.filter((chat) => chat.id !== id);

    if (activeChatId.value === id) {
      newChat();
    }
  }

  async function persistSnapshot(id: string, patch: ChatPatch) {
    const chat = await chatService.update(id, patch);
    const index = chats.value.findIndex((entry) => entry.id === id);

    if (index !== -1) {
      chats.value[index] = chat;
    }
  }

  function setError(message: string | null) {
    error.value = message;
  }

  return {
    chats,
    activeChatId,
    initialSession,
    initialEvents,
    viewKey,
    hydrated,
    loading,
    error,
    hydrate,
    newChat,
    selectChat,
    addChat,
    removeChat,
    persistSnapshot,
    setError,
  };
});
