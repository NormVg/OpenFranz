<script setup lang="ts">
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-vue-next";
import { MarkdownRender } from "markstream-vue";
import type { ScriptWithVersions } from "~~/shared/types/script";

const props = defineProps<{
  script: ScriptWithVersions;
  restoring?: boolean;
}>();

const emit = defineEmits<{
  (event: "edit"): void;
  (event: "delete"): void;
  (event: "restore", versionNumber: number): void;
}>();

const isDark = useIsDark();
const copied = ref(false);

const latest = computed(() => props.script.versions[0] ?? null);

let copyTimer: ReturnType<typeof setTimeout> | null = null;

async function copyContent() {
  const content = latest.value?.content;
  if (!content) return;

  try {
    await navigator.clipboard.writeText(content);
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
  <div class="detail">
    <header class="detail-head">
      <div class="detail-copy">
        <h2 class="detail-title">{{ script.title }}</h2>
        <div class="detail-meta">
          <span v-if="script.brand" class="detail-brand">
            <TagIcon class="detail-brand-icon" aria-hidden="true" />
            {{ script.brand }}
          </span>
          <span class="detail-stat">
            {{ script.versionCount }}
            {{ script.versionCount === 1 ? "version" : "versions" }}
          </span>
          <span class="detail-stat">saved {{ formatRelativeTime(latest?.createdAt ?? script.createdAt) }}</span>
        </div>
      </div>

      <div class="detail-actions">
        <button class="action" type="button" @click="copyContent">
          <CheckIcon v-if="copied" class="action-icon" aria-hidden="true" />
          <CopyIcon v-else class="action-icon" aria-hidden="true" />
          {{ copied ? "Copied" : "Copy" }}
        </button>
        <button class="action" type="button" @click="emit('edit')">
          <PencilIcon class="action-icon" aria-hidden="true" />
          Edit
        </button>
        <button class="action danger" type="button" @click="emit('delete')">
          <Trash2Icon class="action-icon" aria-hidden="true" />
          Delete
        </button>
      </div>
    </header>

    <MarkdownRender
      v-if="latest"
      class="detail-content"
      :content="latest.content"
      mode="chat"
      :final="true"
      :fade="false"
      :is-dark="isDark"
    />
    <p v-else class="detail-empty">This script has no content yet.</p>

    <ScriptVersionHistory
      :script="script"
      :restoring="restoring"
      @restore="emit('restore', $event)"
    />
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 20px 24px 32px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.detail-copy {
  min-width: 0;
}

.detail-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.detail-brand {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 999px;
  font-size: 11px;
  color: var(--muted-foreground);
}

.detail-brand-icon {
  width: 10px;
  height: 10px;
}

.detail-stat {
  font-size: 11.5px;
  color: var(--muted-foreground);
}

.detail-actions {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 11.5px;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.action:hover {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.action:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.action.danger:hover {
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
}

.action-icon {
  width: 13px;
  height: 13px;
}

.detail-content {
  min-width: 0;
  font-size: 14px;
  line-height: 1.65;
}

.detail-empty {
  font-size: 13px;
  color: var(--muted-foreground);
}

@media (max-width: 767px) {
  .detail {
    padding: 16px;
  }

  .detail-head {
    flex-direction: column;
  }
}
</style>
