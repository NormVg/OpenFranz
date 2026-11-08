<script setup lang="ts">
import { ChevronDownIcon, HistoryIcon, RotateCcwIcon } from "lucide-vue-next";
import { MarkdownRender } from "markstream-vue";
import type {
  ScriptVersionRecord,
  ScriptWithVersions,
} from "~~/shared/types/script";

const props = defineProps<{
  script: ScriptWithVersions;
  restoring: boolean;
}>();

const emit = defineEmits<{
  (event: "restore", versionNumber: number): void;
}>();

const isDark = useIsDark();
const openId = ref<string | null>(null);

const versions = computed(() =>
  props.script.versions.slice().sort((left, right) => right.versionNumber - left.versionNumber),
);

function sourceLabel(source: ScriptVersionRecord["source"]): string {
  return source === "agent" ? "Agent" : "You";
}

function toggle(version: ScriptVersionRecord) {
  openId.value = openId.value === version.id ? null : version.id;
}
</script>

<template>
  <section class="history" aria-label="Version history">
    <h2 class="history-title">
      <HistoryIcon class="history-icon" aria-hidden="true" />
      History
      <span class="history-count">{{ versions.length }}</span>
    </h2>

    <ul class="versions">
      <li v-for="version in versions" :key="version.id" class="version">
        <div class="version-row">
          <button
            class="version-main"
            type="button"
            :aria-expanded="openId === version.id"
            @click="toggle(version)"
          >
            <ChevronDownIcon
              class="version-chevron"
              :class="{ open: openId === version.id }"
              aria-hidden="true"
            />
            <span class="version-number">v{{ version.versionNumber }}</span>
            <span class="version-source" :class="{ agent: version.source === 'agent' }">
              {{ sourceLabel(version.source) }}
            </span>
            <span class="version-note">{{ version.note || version.title }}</span>
            <span class="version-time">{{ formatRelativeTime(version.createdAt) }}</span>
          </button>

          <button
            v-if="version.versionNumber !== versions[0]?.versionNumber"
            class="restore"
            type="button"
            :disabled="restoring"
            @click="emit('restore', version.versionNumber)"
          >
            <RotateCcwIcon class="restore-icon" aria-hidden="true" />
            Restore
          </button>
          <span v-else class="current">Current</span>
        </div>

        <div v-if="openId === version.id" class="version-content">
          <MarkdownRender
            class="version-markdown"
            :content="version.content"
            mode="chat"
            :final="true"
            :fade="false"
            :is-dark="isDark"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.history {
  margin-top: 20px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.history-icon {
  width: 13px;
  height: 13px;
  color: var(--muted-foreground);
}

.history-count {
  padding: 0 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  color: var(--muted-foreground);
}

.versions {
  display: flex;
  flex-direction: column;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.version + .version {
  border-top: 1px solid color-mix(in oklab, var(--border) 55%, transparent);
}

.version-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.version-main {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
  padding: 8px 2px;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font-size: 12.5px;
  text-align: left;
}

.version-chevron {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: var(--muted-foreground);
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.version-chevron.open {
  transform: rotate(180deg);
}

.version-number {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.version-source {
  flex-shrink: 0;
  padding: 0 6px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 999px;
  font-size: 10px;
  color: var(--muted-foreground);
}

.version-source.agent {
  border-color: color-mix(in oklab, var(--foreground) 22%, transparent);
  background: color-mix(in oklab, var(--foreground) 8%, transparent);
  color: var(--foreground);
}

.version-note {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted-foreground);
}

.version-time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--muted-foreground);
}

.restore {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
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

.restore:hover:not(:disabled) {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.restore:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.restore-icon {
  width: 12px;
  height: 12px;
}

.current {
  flex-shrink: 0;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--muted-foreground);
}

.version-content {
  padding: 0 0 12px 22px;
}

.version-markdown {
  font-size: 12.5px;
  line-height: 1.6;
}
</style>
