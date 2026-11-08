<script setup lang="ts">
import { PencilIcon, Trash2Icon } from "lucide-vue-next";
import type { ScriptRecord } from "~~/shared/types/script";
import type { PlannerItemRecord } from "~~/shared/types/plan";
import type { PlannerGroup } from "~~/shared/utils/plan";
import { PLANNER_GROUP_LABELS, PLAN_PLATFORM_LABELS } from "~~/shared/utils/plan";

const props = defineProps<{
  groups: PlannerGroup<PlannerItemRecord>[];
  scripts: ScriptRecord[];
}>();

const emit = defineEmits<{
  (event: "edit", item: PlannerItemRecord): void;
  (event: "remove", item: PlannerItemRecord): void;
  (event: "cycle", item: PlannerItemRecord): void;
}>();

const scriptTitles = computed(() => {
  const map = new Map<string, string>();
  for (const script of props.scripts) map.set(script.id, script.title);
  return map;
});

const visibleGroups = computed(() =>
  props.groups.filter((group) => group.items.length > 0),
);

function dayParts(iso: string): { weekday: string; day: string } {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { weekday: "?", day: "" };

  return {
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
    day: String(date.getDate()),
  };
}

function metaLine(item: PlannerItemRecord): string {
  const parts = [PLAN_PLATFORM_LABELS[item.platform]];

  if (item.format) parts.push(item.format);
  if (item.brand) parts.push(item.brand);
  if (item.plannedTime) parts.push(item.plannedTime);

  return parts.join(" · ");
}

function nextStatusLabel(status: PlannerItemRecord["status"]): string {
  if (status === "planned") return "Mark drafted";
  if (status === "drafted") return "Mark published";
  return "Mark planned";
}
</script>

<template>
  <div class="board">
    <p v-if="visibleGroups.length === 0" class="board-empty">
      Nothing planned yet. Add the first item, or ask the agent for a content
      plan in chat.
    </p>

    <section
      v-for="group in visibleGroups"
      :key="group.id"
      class="group"
      :class="{ past: group.id === 'past' }"
    >
      <h2 class="group-title">
        {{ PLANNER_GROUP_LABELS[group.id] }}
        <span class="group-count">{{ group.items.length }}</span>
      </h2>

      <ul class="items">
        <li v-for="item in group.items" :key="item.id" class="item">
          <div class="item-day">
            <span class="item-weekday">{{ dayParts(item.plannedDate).weekday }}</span>
            <span class="item-date">{{ dayParts(item.plannedDate).day }}</span>
          </div>

          <div class="item-main">
            <p class="item-title">{{ item.title }}</p>
            <p class="item-meta">
              {{ metaLine(item) }}
              <template v-if="item.scriptId && scriptTitles.get(item.scriptId)">
                · Script: {{ scriptTitles.get(item.scriptId) }}
              </template>
            </p>
            <p v-if="item.rationale" class="item-rationale">{{ item.rationale }}</p>
          </div>

          <div class="item-side">
            <button
              class="status"
              :class="item.status"
              type="button"
              :title="nextStatusLabel(item.status)"
              @click="emit('cycle', item)"
            >
              {{ item.status }}
            </button>
            <button
              class="row-action"
              type="button"
              :aria-label="`Edit ${item.title}`"
              @click="emit('edit', item)"
            >
              <PencilIcon class="row-icon" aria-hidden="true" />
            </button>
            <button
              class="row-action danger"
              type="button"
              :aria-label="`Delete ${item.title}`"
              @click="emit('remove', item)"
            >
              <Trash2Icon class="row-icon" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.board-empty {
  padding: 32px 0;
  font-size: 13px;
  color: var(--muted-foreground);
  text-align: center;
}

.group.past {
  opacity: 0.7;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.group-count {
  padding: 0 7px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 10px;
}

.items {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 12px 12px 12px 0;
  border: 1px solid transparent;
  border-bottom: 1px solid color-mix(in oklab, var(--border) 55%, transparent);
  border-radius: 8px;
  transition: background-color 150ms ease-out;
}

.item:hover {
  background: color-mix(in oklab, var(--muted) 25%, transparent);
}

.item-day {
  display: flex;
  width: 46px;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 0;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 8px;
}

.item-weekday {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.item-date {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.1;
}

.item-main {
  min-width: 0;
  flex: 1;
}

.item-title {
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.item-meta {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--muted-foreground);
}

.item-rationale {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.item-side {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
}

.status {
  padding: 3px 9px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 999px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 10.5px;
  letter-spacing: 0.03em;
  text-transform: capitalize;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out,
    border-color 150ms ease-out;
}

.status:hover {
  color: var(--foreground);
}

.status.drafted {
  border-color: color-mix(in oklab, var(--foreground) 30%, transparent);
  background: color-mix(in oklab, var(--foreground) 8%, transparent);
  color: var(--foreground);
}

.status.published {
  border-color: transparent;
  background: var(--foreground);
  color: var(--background);
}

.row-action {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  opacity: 0;
  cursor: pointer;
  transition:
    opacity 150ms ease-out,
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.item:hover .row-action,
.row-action:focus-visible {
  opacity: 1;
}

.row-action:hover {
  background: color-mix(in oklab, var(--muted) 60%, transparent);
  color: var(--foreground);
}

.row-action.danger:hover {
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
}

.row-action:focus-visible {
  opacity: 1;
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.row-icon {
  width: 13px;
  height: 13px;
}

@media (max-width: 767px) {
  .row-action {
    opacity: 1;
  }
}
</style>
