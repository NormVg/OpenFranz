<script setup lang="ts">
import type { EveMessage } from "eve/client";
import { MarkdownRender } from "markstream-vue";

const props = defineProps<{
  message: EveMessage;
  isDark: boolean;
}>();

const isUser = computed(() => props.message.role === "user");
</script>

<template>
  <article class="message" :data-role="message.role">
    <div :class="isUser ? 'user-bubble' : 'assistant-body'">
      <template v-for="(part, index) in message.parts" :key="index">
        <MarkdownRender
          v-if="part.type === 'text' && !isUser"
          class="markdown"
          :content="part.text"
          mode="chat"
          :final="part.state !== 'streaming'"
          :smooth-streaming="part.state === 'streaming' ? 'auto' : false"
          :typewriter="part.state === 'streaming' ? 'simple' : false"
          :fade="false"
          :is-dark="isDark"
        />
        <p v-else-if="part.type === 'text'" class="user-text">{{ part.text }}</p>
        <p v-else-if="part.type === 'reasoning'" class="reasoning">
          {{ part.text }}
        </p>
        <span v-else-if="part.type === 'tool'" class="chip">
          {{ part.label }}
        </span>
        <span v-else-if="part.type === 'file'" class="chip">
          {{ part.filename ?? "Attachment" }}
        </span>
      </template>
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

.reasoning {
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted-foreground);
  white-space: pre-wrap;
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
</style>
