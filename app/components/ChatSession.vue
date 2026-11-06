<script setup lang="ts">
import type {
  ClientSessionState,
  MessageContent,
  MessagePart,
  SessionStreamEvent,
} from "eve/client";
import { activeTurn } from "eve/events";
import { useStickToBottom } from "markstream-vue/utils";
import { createTitle } from "~~/shared/utils/chat";
import { useChatStore } from "~/stores/chat";

const props = defineProps<{
  chatId: string | null;
  initialSession?: ClientSessionState;
  initialEvents?: SessionStreamEvent[];
  resume?: boolean;
  isDark: boolean;
}>();

const emit = defineEmits<{
  (event: "status", value: "idle" | "busy" | "resuming"): void;
}>();

const chatStore = useChatStore();
const localChatId = ref<string | null>(props.chatId);
const draft = ref("");
const isStopping = ref(false);

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const { messages, status, error, view, session, events, send, cancel } =
  useEveAgent({
    initialSession: props.initialSession
      ? plain(props.initialSession)
      : undefined,
    initialEvents: props.initialEvents ? plain(props.initialEvents) : undefined,
    resume: props.resume,
  });

const scroller = ref<HTMLElement | null>(null);
const contentRoot = ref<HTMLElement | null>(null);
const { scheduleScrollToBottom } = useStickToBottom(scroller, contentRoot);

const isBusy = computed(() => status.value === "busy");
const isResuming = computed(() => status.value === "resuming");
const isTurnOpen = computed(() => activeTurn(view.value) !== undefined);

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (!localChatId.value) return;

  void chatStore
    .persistSnapshot(localChatId.value, {
      session: session.value,
      events: [...events.value],
    })
    .catch(() => {
      chatStore.setError("Unable to save this chat. Please try again.");
    });
}

function schedulePersist() {
  if (!localChatId.value) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("The image could not be read."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

async function buildMessageContent(
  text: string,
  files: File[],
): Promise<MessageContent> {
  if (files.length === 0) return text;

  const parts: MessagePart[] = [];
  if (text) parts.push({ type: "text", text });

  for (const file of files) {
    parts.push({
      type: "file",
      mediaType: file.type || "application/octet-stream",
      filename: file.name,
      data: await fileToDataUrl(file),
    });
  }

  return parts;
}

async function submit(files: File[] = []) {
  const text = draft.value.trim();
  if ((!text && files.length === 0) || isBusy.value || isResuming.value) return;

  if (!localChatId.value) {
    try {
      const chat = await chatStore.addChat(
        createTitle(text || files[0]?.name || "New chat"),
      );
      localChatId.value = chat.id;
    } catch {
      chatStore.setError("Unable to create this chat. Please try again.");
      return;
    }
  }

  let content: MessageContent;
  try {
    content = await buildMessageContent(text, files);
  } catch {
    chatStore.setError("Unable to read that image. Please try again.");
    return;
  }

  draft.value = "";
  await send(content);
  scheduleScrollToBottom();
}

async function stop() {
  if (isStopping.value) return;
  isStopping.value = true;

  try {
    await cancel();
  } finally {
    isStopping.value = false;
  }
}

watch(
  () => messages.value.length,
  () => scheduleScrollToBottom(),
);

watch(
  () => events.value.length,
  () => schedulePersist(),
);

watch(
  status,
  (value) => emit("status", value),
  { immediate: true },
);

onMounted(() => scheduleScrollToBottom());

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer);
  persist();
});
</script>

<template>
  <div class="session">
    <div v-if="messages.length === 0" class="home">
      <div class="home-inner">
        <BrandMark class="home-mark" />
        <div class="home-copy">
          <h1>What should we build?</h1>
          <p>Ask about the project, the agent runtime, or the next feature.</p>
        </div>
        <ChatComposer
          v-model="draft"
          autofocus
          :busy="isBusy"
          :stopping="isStopping"
          :disabled="isResuming"
          @submit="submit"
          @stop="stop"
        />
      </div>
    </div>

    <template v-else>
      <div ref="scroller" class="conversation" role="log">
        <div ref="contentRoot" class="conversation-content">
          <ChatMessage
            v-for="message in messages"
            :key="message.id"
            :message="message"
            :is-dark="isDark"
          />
        </div>
      </div>

      <div class="composer-wrap">
        <p v-if="error" class="error" role="alert">{{ error.message }}</p>
        <ChatComposer
          v-model="draft"
          :busy="isBusy"
          :stopping="isStopping"
          :disabled="isResuming"
          @submit="submit"
          @stop="stop"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.session {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.home {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 32px 16px 12vh;
}

.home-inner {
  display: flex;
  width: 100%;
  max-width: 672px;
  flex-direction: column;
  gap: 20px;
}

.home-mark {
  display: block;
  width: 64px;
  height: 43px;
  align-self: center;
  color: var(--foreground);
}

.home-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
}

.home-copy h1 {
  font-size: 24px;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.home-copy p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.conversation {
  position: relative;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.conversation-content {
  display: flex;
  width: 100%;
  max-width: 672px;
  flex-direction: column;
  gap: 16px;
  margin: 0 auto;
  padding: 24px 16px;
}

.composer-wrap {
  display: flex;
  width: 100%;
  max-width: 672px;
  flex-direction: column;
  gap: 8px;
  margin: 0 auto;
  padding: 0 16px 16px;
}

.error {
  padding: 8px 12px;
  border: 1px solid color-mix(in oklab, var(--destructive) 35%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  font-size: 13px;
  line-height: 1.5;
  color: var(--destructive);
}

@media (min-width: 640px) {
  .conversation-content {
    padding: 24px;
  }

  .composer-wrap {
    padding: 0 24px 24px;
  }
}
</style>
