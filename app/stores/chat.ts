import { defineStore } from "pinia";
import type { ClientSessionState, SessionStreamEvent } from "eve/client";
import {
  createChat,
  deleteChat,
  getActiveChatId,
  getChat,
  listChats,
  saveChat,
  setActiveChatId,
  type ChatRecord,
} from "~/composables/useChatHistory";

export const useChatStore = defineStore("chat", () => {
  const chats = ref<ChatRecord[]>([]);
  const activeChatId = ref<string | null>(null);
  const initialSession = ref<ClientSessionState | undefined>();
  const initialEvents = ref<SessionStreamEvent[]>([]);
  const viewKey = ref(0);
  const hydrated = ref(false);

  function hydrate() {
    if (hydrated.value) return;

    chats.value = listChats();
    const savedId = getActiveChatId();
    const saved = savedId ? getChat(savedId) : null;

    if (saved) {
      activeChatId.value = saved.id;
      initialSession.value = saved.session;
      initialEvents.value = saved.events;
      viewKey.value += 1;
    }

    hydrated.value = true;
  }

  function newChat() {
    activeChatId.value = null;
    initialSession.value = undefined;
    initialEvents.value = [];
    viewKey.value += 1;
    setActiveChatId(null);
  }

  function selectChat(id: string) {
    const chat = getChat(id);
    if (!chat) return;

    activeChatId.value = chat.id;
    initialSession.value = chat.session;
    initialEvents.value = chat.events;
    viewKey.value += 1;
    setActiveChatId(chat.id);
  }

  function addChat(title: string) {
    const chat = createChat(title);
    chats.value = listChats();
    activeChatId.value = chat.id;
    setActiveChatId(chat.id);
    return chat;
  }

  function removeChat(id: string) {
    deleteChat(id);
    chats.value = listChats();

    if (activeChatId.value === id) {
      newChat();
    }
  }

  function persistSnapshot(
    id: string,
    patch: {
      session?: ClientSessionState;
      events?: SessionStreamEvent[];
    },
  ) {
    saveChat(id, patch);
    chats.value = listChats();
  }

  return {
    chats,
    activeChatId,
    initialSession,
    initialEvents,
    viewKey,
    hydrated,
    hydrate,
    newChat,
    selectChat,
    addChat,
    removeChat,
    persistSnapshot,
  };
});
