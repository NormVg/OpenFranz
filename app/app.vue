<script setup lang="ts">
import { activeTurn } from "eve/events";
import { MarkdownRender } from "markstream-vue";
import { useStickToBottom } from "markstream-vue/utils";

const { messages, status, error, view, send, cancel, newSession } = useEveAgent();

const draft = ref("");
const scroller = ref<HTMLElement | null>(null);
const contentRoot = ref<HTMLElement | null>(null);
const { scheduleScrollToBottom } = useStickToBottom(scroller, contentRoot);

const isBusy = computed(() => status.value === "busy");
const isResuming = computed(() => status.value === "resuming");
const isTurnOpen = computed(() => activeTurn(view.value) !== undefined);
const canSend = computed(
  () => draft.value.trim().length > 0 && !isBusy.value && !isResuming.value,
);

const statusLabel = computed(() => {
  if (status.value === "busy") return "Working";
  if (status.value === "resuming") return "Resuming";
  return "Idle";
});

async function submit() {
  const text = draft.value.trim();
  if (!text || !canSend.value) return;
  draft.value = "";
  await send(text);
  scheduleScrollToBottom();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void submit();
  }
}

watch(
  () => messages.value.length,
  () => scheduleScrollToBottom(),
);

onMounted(() => scheduleScrollToBottom());
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="mark" aria-hidden="true"></span>
        <div class="brand-text">
          <h1>OpenFranz</h1>
          <p>Nuxt + eve agent</p>
        </div>
      </div>

      <div class="topbar-actions">
        <span class="status" :data-state="status">
          <span class="status-dot" aria-hidden="true"></span>
          {{ statusLabel }}
        </span>
        <button class="ghost-button" type="button" @click="newSession">
          New session
        </button>
      </div>
    </header>

    <main ref="scroller" class="conversation" aria-live="polite">
      <div ref="contentRoot" class="conversation-content">
        <div v-if="messages.length === 0" class="empty">
          <p class="eyebrow">Agent ready</p>
          <h2>What should we build?</h2>
          <p class="empty-copy">
            Ask about the project, the agent runtime, or the next feature.
          </p>
        </div>

        <article
          v-for="message in messages"
          :key="message.id"
          class="message"
          :data-role="message.role"
        >
          <p class="role">{{ message.role === "user" ? "You" : "OpenFranz" }}</p>
          <div class="bubble">
            <template
              v-for="(part, index) in message.parts"
              :key="part.id ?? index"
            >
              <MarkdownRender
                v-if="part.type === 'text' && message.role === 'assistant'"
                class="markdown"
                :content="part.text"
                mode="chat"
                :final="part.state !== 'streaming'"
                :smooth-streaming="part.state === 'streaming' ? 'auto' : false"
                :typewriter="part.state === 'streaming' ? 'simple' : false"
                :fade="false"
                :is-dark="true"
              />
              <p v-else-if="part.type === 'text'" class="text">{{ part.text }}</p>
              <p v-else-if="part.type === 'reasoning'" class="reasoning">
                {{ part.text }}
              </p>
              <p v-else-if="part.type === 'tool'" class="tool">
                {{ part.label }}
              </p>
              <p v-else-if="part.type === 'file'" class="file">
                {{ part.filename ?? "Attachment" }}
              </p>
            </template>
          </div>
        </article>
      </div>
    </main>

    <footer class="composer">
      <p v-if="error" class="error" role="alert">{{ error.message }}</p>

      <form class="composer-row" @submit.prevent="submit">
        <textarea
          v-model="draft"
          class="input"
          rows="1"
          placeholder="Message the agent"
          :disabled="isResuming"
          aria-label="Message the agent"
          @keydown="onKeydown"
        />
        <button
          v-if="isTurnOpen"
          class="stop-button"
          type="button"
          @click="cancel"
        >
          Stop
        </button>
        <button class="send-button" type="submit" :disabled="!canSend">
          Send
        </button>
      </form>

      <p class="hint">Enter to send · Shift + Enter for a new line</p>
    </footer>
  </div>
</template>

<style>
:root {
  color-scheme: dark;
  --bg-root: #0a0a0a;
  --bg-surface-1: #141414;
  --bg-surface-2: #1c1c1c;
  --border-default: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);
  --border-focus: rgba(255, 255, 255, 0.4);
  --text-primary: #efefef;
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-muted: rgba(255, 255, 255, 0.35);
  --accent: hsl(152, 58%, 44%);
  --accent-soft: hsla(152, 60%, 50%, 0.14);
  --danger: hsl(0, 65%, 60%);
  --danger-soft: hsla(0, 65%, 60%, 0.14);
  --radius-medium: 8px;
  --radius-large: 12px;
  --radius-xl: 20px;
  --shadow-tight: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-ambient: 0 12px 32px rgba(0, 0, 0, 0.35);
}

* {
  box-sizing: border-box;
}

html,
body,
#__nuxt {
  height: 100%;
}

body {
  margin: 0;
  background: var(--bg-root);
  color: var(--text-primary);
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1,
h2,
p {
  margin: 0;
}

.shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100dvh;
  max-width: 880px;
  margin: 0 auto;
  border-inline: 1px solid var(--border-default);
  background: var(--bg-root);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-default);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mark {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-medium);
  background:
    radial-gradient(circle at 30% 30%, var(--accent), transparent 70%),
    var(--bg-surface-2);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-tight), var(--shadow-ambient);
}

.brand-text h1 {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.01em;
}

.brand-text p {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-muted);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 9999px;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--text-muted);
  transition: background-color 150ms ease-out;
}

.status[data-state="busy"] .status-dot {
  background: var(--accent);
  animation: breathe 1.6s ease-in-out infinite;
}

.status[data-state="resuming"] .status-dot {
  background: var(--text-secondary);
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

.ghost-button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition:
    border-color 150ms ease-out,
    color 150ms ease-out,
    transform 150ms ease-out;
}

.ghost-button:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.ghost-button:active {
  transform: scale(0.96);
}

.conversation {
  overflow-y: auto;
  padding: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.conversation-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100%;
}

.empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}

.eyebrow {
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.empty h2 {
  font-size: 24px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.empty-copy {
  max-width: 36ch;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 78%;
  animation: rise 200ms ease-out both;
}

.message[data-role="user"] {
  align-self: flex-end;
  align-items: flex-end;
}

.message[data-role="assistant"] {
  align-self: flex-start;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.role {
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.bubble {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-large);
  background: var(--bg-surface-1);
  box-shadow: var(--shadow-tight);
}

.message[data-role="user"] .bubble {
  background: var(--bg-surface-2);
  border-color: var(--border-strong);
}

.text {
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.markdown {
  font-size: 15px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.markdown :where(p, ul, ol, blockquote, pre, table) {
  margin-block: 0 8px;
}

.markdown :where(p:last-child, ul:last-child, ol:last-child, pre:last-child, table:last-child) {
  margin-bottom: 0;
}

.markdown :where(a) {
  color: var(--accent);
}

.markdown :where(code) {
  font-size: 13px;
}

.reasoning {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  white-space: pre-wrap;
}

.tool,
.file {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  padding: 4px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-medium);
  background: var(--bg-surface-2);
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border-default);
}

.error {
  padding: 8px 12px;
  border: 1px solid hsla(0, 65%, 60%, 0.35);
  border-radius: var(--radius-medium);
  background: var(--danger-soft);
  font-size: 13px;
  line-height: 1.5;
  color: var(--danger);
}

.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input {
  flex: 1;
  min-height: 48px;
  max-height: 160px;
  padding: 12px 16px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-large);
  background: var(--bg-surface-1);
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition:
    border-color 150ms ease-out,
    box-shadow 150ms ease-out;
}

.input::placeholder {
  color: var(--text-muted);
}

.input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
}

.input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-button,
.stop-button {
  height: 48px;
  padding: 0 20px;
  border-radius: var(--radius-medium);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 150ms ease-out,
    background-color 150ms ease-out,
    border-color 150ms ease-out,
    opacity 150ms ease-out;
}

.send-button {
  border: 1px solid transparent;
  background: var(--accent);
  color: #06110c;
}

.send-button:hover:not(:disabled) {
  background: hsl(152, 58%, 50%);
}

.send-button:active:not(:disabled) {
  transform: scale(0.96);
}

.send-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stop-button {
  border: 1px solid hsla(0, 65%, 60%, 0.35);
  background: var(--danger-soft);
  color: var(--danger);
}

.stop-button:hover {
  border-color: var(--danger);
}

.stop-button:active {
  transform: scale(0.96);
}

.hint {
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .shell {
    border-inline: none;
  }

  .topbar,
  .conversation,
  .composer {
    padding-inline: 16px;
  }

  .message {
    max-width: 90%;
  }

  .brand-text p {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
