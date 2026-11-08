<script setup lang="ts">
import type { EveMessage, EveMessagePart } from "eve/client";
import {
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  TagIcon,
} from "lucide-vue-next";
import { MarkdownRender } from "markstream-vue";
import { parseBrandContext } from "~~/shared/utils/brand-context";
import { parseDeepMode } from "~~/shared/utils/deep-mode";
import { parseScriptSegments } from "~~/shared/utils/script-block";

const props = defineProps<{
  message: EveMessage;
  isDark: boolean;
}>();

const isUser = computed(() => props.message.role === "user");

const userBrand = computed(() => {
  if (!isUser.value) return null;

  const text = props.message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");
  const parsed = parseBrandContext(parseDeepMode(text).text);

  if (!parsed.slug) return null;
  return {
    slug: parsed.slug,
    name: parsed.name ?? parsed.slug,
    product: parsed.product,
  };
});

const userDeep = computed(() => {
  if (!isUser.value) return false;

  const text = props.message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n");

  return parseDeepMode(text).deep;
});

function displayText(text: string): string {
  return parseBrandContext(parseDeepMode(text).text).text;
}

function isPartStreaming(part: EveMessagePart): boolean {
  return "state" in part && part.state === "streaming";
}

const reasoningText = computed(() =>
  props.message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.text)
    .join("\n\n"),
);

const isReasoningStreaming = computed(() =>
  props.message.parts.some(
    (part) => part.type === "reasoning" && part.state === "streaming",
  ),
);

const visibleParts = computed(() =>
  props.message.parts.filter((part) => part.type !== "reasoning"),
);

const copyText = computed(() =>
  props.message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n"),
);

const isStreaming = computed(() => props.message.parts.some(isPartStreaming));

const reasoningOpen = ref(false);
const copied = ref(false);
const reasoningId = useId();

let copyTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  isReasoningStreaming,
  (streaming, wasStreaming) => {
    if (streaming) {
      reasoningOpen.value = true;
      return;
    }

    if (wasStreaming) {
      reasoningOpen.value = false;
    }
  },
  { immediate: true },
);

async function copyResponse() {
  if (!copyText.value) return;

  try {
    await navigator.clipboard.writeText(copyText.value);
    copied.value = true;

    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});
</script>

<template>
  <article class="message" :data-role="message.role">
    <div :class="isUser ? 'user-bubble' : 'assistant-body'">
      <div v-if="isUser && (userBrand || userDeep)" class="user-chips">
        <div v-if="userDeep" class="user-deep">
          <BrainIcon class="user-deep-icon" aria-hidden="true" />
          Deep
        </div>
        <div v-if="userBrand" class="user-brand">
          <TagIcon class="user-brand-icon" aria-hidden="true" />
          {{ userBrand.name }}
          <template v-if="userBrand.product"> · {{ userBrand.product }}</template>
        </div>
      </div>

      <div v-if="!isUser && reasoningText" class="reasoning-block">
        <button
          class="reasoning-toggle"
          type="button"
          :aria-expanded="reasoningOpen"
          :aria-controls="reasoningId"
          @click="reasoningOpen = !reasoningOpen"
        >
          <ChevronDownIcon
            class="reasoning-chevron"
            :class="{ open: reasoningOpen }"
            aria-hidden="true"
          />
          <span class="reasoning-label">Reasoning</span>
          <span v-if="isReasoningStreaming" class="reasoning-live">thinking</span>
        </button>

        <div
          :id="reasoningId"
          class="reasoning-body"
          :class="{ open: reasoningOpen }"
        >
          <div class="reasoning-inner">
            <p class="reasoning">{{ reasoningText }}</p>
          </div>
        </div>
      </div>

      <template v-for="(part, index) in visibleParts" :key="index">
        <template v-if="part.type === 'text' && !isUser">
          <template
            v-for="(segment, segIndex) in parseScriptSegments(part.text)"
            :key="segIndex"
          >
            <ScriptCard
              v-if="segment.type === 'script'"
              :title="segment.title"
              :brand="segment.brand"
              :content="segment.content"
              :streaming="!segment.closed && isPartStreaming(part)"
              :is-dark="isDark"
            />
            <MarkdownRender
              v-else
              class="markdown"
              :content="segment.text"
              mode="chat"
              :final="part.state !== 'streaming'"
              :smooth-streaming="part.state === 'streaming' ? 'auto' : false"
              :typewriter="part.state === 'streaming' ? 'simple' : false"
              :fade="false"
              :is-dark="isDark"
            />
          </template>
        </template>
        <p v-else-if="part.type === 'text'" class="user-text">
          {{ displayText(part.text) }}
        </p>
        <span v-else-if="part.type === 'tool'" class="chip">
          {{ part.label }}
        </span>
        <template v-else-if="part.type === 'file'">
          <img
            v-if="part.mediaType.startsWith('image/') && part.url"
            class="attachment-image"
            :src="part.url"
            :alt="part.filename ?? 'Attached image'"
          />
          <span v-else class="chip">
            {{ part.filename ?? "Attachment" }}
          </span>
        </template>
      </template>

      <div v-if="!isUser && copyText && !isStreaming" class="message-actions">
        <button
          class="action"
          type="button"
          :aria-label="copied ? 'Copied' : 'Copy response'"
          @click="copyResponse"
        >
          <CheckIcon v-if="copied" class="action-icon" aria-hidden="true" />
          <CopyIcon v-else class="action-icon" aria-hidden="true" />
          <span>{{ copied ? "Copied" : "Copy" }}</span>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.message {
  display: flex;
  width: 100%;
  min-width: 0;
}

.message[data-role="user"] {
  justify-content: flex-end;
}

.message[data-role="assistant"] {
  justify-content: flex-start;
}

.user-bubble {
  max-width: 85%;
  padding: 6px 12px;
  border: 1px solid color-mix(in oklab, var(--border) 40%, transparent);
  border-radius: 18px;
  background: color-mix(in oklab, var(--muted) 70%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
  font-size: 15px;
  line-height: 1.5;
  color: var(--foreground);
}

.assistant-body {
  width: 100%;
  min-width: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--foreground);
}

.user-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.user-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.user-brand {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 999px;
  font-size: 10.5px;
  color: var(--muted-foreground);
}

.user-deep {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border: 1px solid color-mix(in oklab, var(--foreground) 22%, transparent);
  border-radius: 999px;
  background: color-mix(in oklab, var(--foreground) 8%, transparent);
  font-size: 10.5px;
  font-weight: 500;
  color: var(--foreground);
}

.user-deep-icon {
  width: 10px;
  height: 10px;
}

.user-brand-icon {
  width: 10px;
  height: 10px;
}

.markdown {
  min-width: 0;
  font-size: 15px;
  line-height: 1.6;
}

.markdown :where(p, ul, ol, blockquote, pre, table) {
  margin-block: 0 12px;
}

.markdown :where(p:last-child, ul:last-child, ol:last-child, pre:last-child, table:last-child) {
  margin-bottom: 0;
}

.markdown :where(a) {
  color: var(--foreground);
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 4px;
}

.markdown :where(code) {
  font-size: 0.92em;
}

.reasoning-block {
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--border) 55%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--muted) 26%, transparent);
}

.reasoning-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.reasoning-toggle:hover {
  background: color-mix(in oklab, var(--muted) 40%, transparent);
  color: var(--foreground);
}

.reasoning-toggle:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: -2px;
}

.reasoning-chevron {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.reasoning-chevron.open {
  transform: rotate(180deg);
}

.reasoning-label {
  font-weight: 500;
  letter-spacing: 0.01em;
}

.reasoning-live {
  margin-left: auto;
  font-size: 11px;
  color: color-mix(in oklab, var(--muted-foreground) 75%, transparent);
  animation: reasoning-pulse 1.6s ease-in-out infinite;
}

.reasoning-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.reasoning-body.open {
  grid-template-rows: 1fr;
}

.reasoning-inner {
  overflow: hidden;
}

.reasoning {
  margin: 0;
  padding: 0 10px 8px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--muted-foreground);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 11.5px;
  line-height: 1.4;
  cursor: pointer;
  opacity: 0.75;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out,
    opacity 150ms ease-out;
}

.action:hover {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
  opacity: 1;
}

.action:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
  opacity: 1;
}

.action-icon {
  width: 13px;
  height: 13px;
}

.attachment-image {
  display: block;
  max-width: min(320px, 100%);
  max-height: 320px;
  margin: 4px 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  object-fit: contain;
}

.chip {
  display: inline-flex;
  align-items: center;
  margin: 4px 4px 4px 0;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: color-mix(in oklab, var(--muted) 40%, transparent);
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted-foreground);
}

@keyframes reasoning-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reasoning-body,
  .reasoning-chevron,
  .reasoning-toggle,
  .action {
    transition: none;
  }

  .reasoning-live {
    animation: none;
  }
}
</style>
