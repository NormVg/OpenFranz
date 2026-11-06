<script setup lang="ts">
import { FolderIcon, Share2Icon } from "lucide-vue-next";

const view = ref<"files" | "graph">("files");
</script>

<template>
  <section class="explorer">
    <header class="explorer-header">
      <div class="explorer-copy">
        <h1>Workspace files</h1>
        <p>Browse text files and the references between them.</p>
      </div>

      <div class="view-switch" role="tablist" aria-label="Filesystem view">
        <button
          class="view-button"
          :class="{ active: view === 'files' }"
          type="button"
          role="tab"
          :aria-selected="view === 'files'"
          @click="view = 'files'"
        >
          <FolderIcon class="view-icon" />
          Files
        </button>
        <button
          class="view-button"
          :class="{ active: view === 'graph' }"
          type="button"
          role="tab"
          :aria-selected="view === 'graph'"
          @click="view = 'graph'"
        >
          <Share2Icon class="view-icon" />
          Graph
        </button>
      </div>
    </header>

    <VfsFileBrowser v-if="view === 'files'" />
    <VfsGraphView v-else />
  </section>
</template>

<style scoped>
.explorer {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.explorer-header {
  display: flex;
  min-height: 64px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.explorer-copy {
  min-width: 0;
}

.explorer-copy h1 {
  font-size: 14px;
  font-weight: 500;
}

.explorer-copy p {
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  color: var(--muted-foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-switch {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: color-mix(in oklab, var(--muted) 35%, transparent);
}

.view-button {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 11px;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.view-button:hover,
.view-button.active {
  background: color-mix(in oklab, var(--card) 85%, transparent);
  color: var(--foreground);
}

.view-icon {
  width: 13px;
  height: 13px;
}

@media (max-width: 640px) {
  .explorer-header {
    min-height: 56px;
  }

  .explorer-copy p {
    display: none;
  }
}
</style>
