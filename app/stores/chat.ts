import { defineStore } from "pinia";
import type { ClientSessionState, SessionStreamEvent } from "eve/client";
import type { ChatPatch, ChatRecord } from "~~/shared/types/chat";
import { chatService } from "~/services/chat.service";
import { eveSessionService } from "~/services/eve-session.service";

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

  /** Sessions recovered in this store's lifetime; persisting them is blocked. */
  const clearedSessionIds = new Set<string>();

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
        await activateChat(saved);
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
    await activateChat(await chatService.get(id));
  }

  async function activateChat(chat: ChatRecord) {
    activeChatId.value = chat.id;
    initialSession.value = chat.session;
    initialEvents.value = chat.events;
    viewKey.value += 1;
    writeActiveChatId(chat.id);

    if (chat.session) void recoverSessionIfStale(chat.id, chat.session);
  }

  /**
   * Probes the persisted cursor in the background; a definitive 404 or stranded
   * answer recovers the chat immediately instead of letting the eve client
   * retry a dead stream for ~43s while the composer hangs on "Resuming".
   */
  async function recoverSessionIfStale(
    chatId: string,
    cursor: ClientSessionState,
  ) {
    if (clearedSessionIds.has(cursor.sessionId)) return;
    if ((await eveSessionService.probe(cursor.sessionId)) !== "recover") return;
    await recoverStaleSession(chatId, cursor.sessionId);
  }

  /**
   * Drops a session the eve runtime can no longer execute. Both the cursor and
   * its recorded events are cleared: `initialEvents` must be an ordered prefix
   * of one session's stream, and events from a dead session collide by
   * position with the next session's replay. Safe to call repeatedly; only
   * the first call persists the cleared state.
   */
  async function recoverStaleSession(chatId: string, staleSessionId: string) {
    const firstRecovery = !clearedSessionIds.has(staleSessionId);
    clearedSessionIds.add(staleSessionId);

    // Present the chat fresh only while the stale cursor is still mounted.
    if (
      activeChatId.value === chatId &&
      initialSession.value?.sessionId === staleSessionId
    ) {
      initialSession.value = undefined;
      initialEvents.value = [];
      viewKey.value += 1;
    }

    if (!firstRecovery) return;

    try {
      await persistSnapshot(chatId, { session: null, events: [] });
    } catch {
      setError("Unable to save this chat. Please try again.");
    }
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
    // An instance mounted on a recovered session can still flush its dead
    // cursor on unmount; never persist a cleared session id back over it.
    if (patch.session && clearedSessionIds.has(patch.session.sessionId)) return;

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
    recoverStaleSession,
    setError,
  };
});
