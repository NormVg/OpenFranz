<script setup lang="ts">
import { SearchIcon } from "lucide-vue-next";
import type { ScriptRecord } from "~~/shared/types/script";

const props = defineProps<{
  scripts: ScriptRecord[];
  activeId: string | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (event: "select", id: string): void;
}>();

const query = ref("");

const filtered = computed(() => {
  const value = query.value.trim().toLowerCase();
  if (!value) return props.scripts;

  return props.scripts.filter((script) =>
    [script.title, script.brand].join(" ").toLowerCase().includes(value),
  );
});
</script>

<template>
  <aside class="script-list" aria-label="Scripts">
    <div class="search">
      <SearchIcon class="search-icon" aria-hidden="true" />
      <input
        v-model="query"
        class="search-input"
        type="search"
        placeholder="Search scripts"
        aria-label="Search scripts"
      />
    </div>

    <p v-if="loading" class="state">Loading scripts...</p>
    <p v-else-if="filtered.length === 0" class="state">
      No scripts yet. Save one from chat, or ask the agent to write one.
    </p>
    <ul v-else class="items">
      <li v-for="script in filtered" :key="script.id">
        <button
          class="item"
          :class="{ active: script.id === activeId }"
          type="button"
          @click="emit('select', script.id)"
        >
          <span class="item-name">{{ script.title }}</span>
          <span class="item-meta">
            {{ script.brand ? `${script.brand} · ` : "" }}
            {{ script.versionCount }}
            {{ script.versionCount === 1 ? "version" : "versions" }}
          </span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.script-list {
  display: flex;
  width: 240px;
  flex-shrink: 0;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--border);
}

.search {
  position: relative;
  padding: 10px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 20px;
  width: 13px;
  height: 13px;
  color: var(--muted-foreground);
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 30px;
  padding: 0 8px 0 28px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 7px;
  background: color-mix(in oklab, var(--muted) 25%, transparent);
  color: var(--foreground);
  font-size: 12px;
  outline: none;
}

.search-input:focus {
  border-color: var(--border);
}

.state {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.items {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.item {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 2px;
  padding: 7px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  text-align: left;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.item:hover,
.item.active {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.item-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .script-list {
    width: 100%;
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
</style>
