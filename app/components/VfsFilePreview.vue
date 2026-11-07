<script setup lang="ts">
import { XIcon } from "lucide-vue-next";
import { MarkdownRender } from "markstream-vue";
import type { VfsEntry, VfsLinkInfo } from "~~/shared/types/vfs";

defineProps<{
  file?: VfsEntry | null;
  content?: string;
  links?: {
    outgoing: VfsLinkInfo[];
    backlinks: VfsLinkInfo[];
  } | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const isDark = ref(true);
let themeObserver: MutationObserver | null = null;

function readTheme() {
  isDark.value = document.documentElement.dataset.theme !== "light";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

onMounted(() => {
  readTheme();
  themeObserver = new MutationObserver(readTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
});

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
});
</script>

<template>
  <section class="preview">
    <template v-if="file">
      <header class="preview-header">
        <div class="preview-title">
          <h2>{{ file.name }}</h2>
          <p>{{ file.path }}</p>
        </div>
        <div class="preview-actions">
          <span class="preview-meta">
            {{ file.size }} B · {{ formatDate(file.updatedAt) }}
          </span>
          <button
            class="close-button"
            type="button"
            aria-label="Close preview"
            title="Close preview"
            @click="emit('close')"
          >
            <XIcon class="close-icon" />
          </button>
        </div>
      </header>

      <p v-if="loading" class="empty">Loading file...</p>
      <MarkdownRender
        v-else
        class="content markdown"
        :content="content ?? ''"
        mode="chat"
        :final="true"
        :fade="false"
        :is-dark="isDark"
      />

      <footer v-if="links" class="link-summary">
        <span>{{ links.outgoing.length }} outgoing</span>
        <span>{{ links.backlinks.length }} backlinks</span>
      </footer>
    </template>

    <p v-else class="empty">Select a file to read it.</p>
  </section>
</template>

<style scoped>
.preview {
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.preview-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.close-button {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.close-button:hover {
  background: color-mix(in oklab, var(--muted) 55%, transparent);
  color: var(--foreground);
}

.close-icon {
  width: 14px;
  height: 14px;
}

.preview-title {
  min-width: 0;
}

.preview-title h2 {
  overflow: hidden;
  font-size: 15px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-title p {
  margin-top: 3px;
  overflow: hidden;
  font-family: var(--font-sans);
  font-size: 10px;
  color: var(--muted-foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-meta {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 10px;
  color: var(--muted-foreground);
}

.content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 20px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.content :deep(p, ul, ol, blockquote, pre, table) {
  margin-bottom: 12px;
}

.content :deep(p:last-child, ul:last-child, ol:last-child, pre:last-child, table:last-child) {
  margin-bottom: 0;
}

.content :deep(a) {
  color: var(--foreground);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.content :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.link-summary {
  display: flex;
  gap: 16px;
  padding: 10px 20px;
  border-top: 1px solid var(--border);
  font-family: var(--font-sans);
  font-size: 10px;
  color: var(--muted-foreground);
}

.empty {
  padding: 24px 20px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted-foreground);
}
</style>
