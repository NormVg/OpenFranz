import type { ClientSessionState, SessionStreamEvent } from "eve/client";

export interface ChatRecord {
  id: string;
  title: string;
  updatedAt: string;
  session?: ClientSessionState;
  events: SessionStreamEvent[];
}

interface StoredState {
  version: number;
  chats: ChatRecord[];
}

const STORAGE_KEY = "openfranz:chats";
const ACTIVE_KEY = "openfranz:active-chat";
const STORAGE_VERSION = 1;
const MAX_CHATS = 50;
const DEFAULT_TITLE = "New chat";

function isBrowser() {
  return typeof window !== "undefined";
}

function emptyState(): StoredState {
  return { version: STORAGE_VERSION, chats: [] };
}

function readState(): StoredState {
  if (!isBrowser()) return emptyState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.chats)) {
      return emptyState();
    }

    return {
      version: STORAGE_VERSION,
      chats: parsed.chats.filter(isChatRecord),
    };
  } catch {
    return emptyState();
  }
}

function writeState(chats: ChatRecord[]) {
  if (!isBrowser()) return;

  const next = [...chats]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_CHATS);

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, chats: next } satisfies StoredState),
    );
  } catch {
    // Browser storage is full; keep the in-memory list usable.
  }
}

function isChatRecord(value: unknown): value is ChatRecord {
  if (!value || typeof value !== "object") return false;

  const chat = value as Partial<ChatRecord>;
  return (
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    typeof chat.updatedAt === "string" &&
    Array.isArray(chat.events)
  );
}

export function listChats(): ChatRecord[] {
  return readState().chats;
}

export function getChat(id: string): ChatRecord | null {
  return readState().chats.find((chat) => chat.id === id) ?? null;
}

export function createChat(title: string): ChatRecord {
  const chat: ChatRecord = {
    id: crypto.randomUUID(),
    title: title || DEFAULT_TITLE,
    updatedAt: new Date().toISOString(),
    events: [],
  };

  writeState([chat, ...readState().chats]);
  return chat;
}

export function deleteChat(id: string) {
  writeState(readState().chats.filter((chat) => chat.id !== id));
}

export function saveChat(
  id: string,
  patch: {
    session?: ClientSessionState;
    events?: SessionStreamEvent[];
    title?: string;
  },
) {
  const chats = readState().chats;
  const index = chats.findIndex((chat) => chat.id === id);
  if (index === -1) return;

  const current = chats[index]!;
  chats[index] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  writeState(chats);
}

export function setActiveChatId(id: string | null) {
  if (!isBrowser()) return;

  if (id) {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } else {
    window.localStorage.removeItem(ACTIVE_KEY);
  }
}

export function getActiveChatId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function createTitle(input: string): string {
  const text = input
    .replace(/\s+/g, " ")
    .replace(/[`*_#>]/g, "")
    .trim();

  if (!text) return DEFAULT_TITLE;
  return text.length > 72 ? `${text.slice(0, 69).trimEnd()}...` : text;
}
