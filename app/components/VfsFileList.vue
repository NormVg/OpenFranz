<script setup lang="ts">
import { FileTextIcon, FolderIcon } from "lucide-vue-next";
import type { VfsEntry } from "~~/shared/types/vfs";

defineProps<{
  entries: VfsEntry[];
  activePath?: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (event: "open", entry: VfsEntry): void;
}>();

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <div class="file-list">
    <p v-if="loading" class="empty">Loading files...</p>
    <p v-else-if="entries.length === 0" class="empty">
      No files here yet. Ask the agent to create one.
    </p>

    <button
      v-for="entry in entries"
      :key="entry.path"
      class="file-row"
      :class="{ active: entry.path === activePath }"
      type="button"
      @click="emit('open', entry)"
    >
      <FolderIcon v-if="entry.type === 'directory'" class="file-icon" />
      <FileTextIcon v-else class="file-icon" />
      <span class="file-name">{{ entry.name }}</span>
      <span class="file-meta">
        {{ entry.type === "directory" ? "Folder" : formatSize(entry.size) }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.file-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  padding: 8px;
}

.empty {
  padding: 16px 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.file-row {
  display: flex;
  min-width: 0;
  height: 36px;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  text-align: left;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.file-row:hover,
.file-row.active {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.file-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.file-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  flex-shrink: 0;
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 10px;
  color: color-mix(in oklab, var(--muted-foreground) 70%, transparent);
}
</style>
