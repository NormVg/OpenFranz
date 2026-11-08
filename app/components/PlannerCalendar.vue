<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-vue-next";
import type { PlannerItemRecord } from "~~/shared/types/plan";
import { buildPlannerMonth } from "~~/shared/utils/plan";

const props = defineProps<{
  items: PlannerItemRecord[];
  todayIso: string;
}>();

const emit = defineEmits<{
  (event: "edit", item: PlannerItemRecord): void;
  (event: "new", date: string): void;
}>();

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const anchor = ref(startOfMonth(new Date()));
// Bumped on every month change so the grid re-runs its entrance animation.
const gridTick = ref(0);

function shiftMonth(delta: number): void {
  anchor.value = new Date(
    anchor.value.getFullYear(),
    anchor.value.getMonth() + delta,
    1,
  );
  gridTick.value += 1;
}

function goToToday(): void {
  anchor.value = startOfMonth(new Date());
  gridTick.value += 1;
}

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    anchor.value,
  ),
);

const rows = computed(() => {
  const cells = buildPlannerMonth(anchor.value);
  // Six fixed rows of seven; the table remounts on month change, so
  // positional row keys are stable where it matters.
  const grouped: (typeof cells)[] = [];

  for (let index = 0; index < cells.length; index += 7) {
    grouped.push(cells.slice(index, index + 7));
  }

  return grouped;
});

const itemsByDate = computed(() => {
  const map = new Map<string, PlannerItemRecord[]>();

  for (const item of props.items) {
    const list = map.get(item.plannedDate);
    if (list) list.push(item);
    else map.set(item.plannedDate, [item]);
  }

  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        a.plannedTime.localeCompare(b.plannedTime) ||
        a.title.localeCompare(b.title),
    );
  }

  return map;
});

function chipTitle(item: PlannerItemRecord): string {
  return item.plannedTime
    ? `${item.title} · ${item.plannedTime}`
    : item.title;
}
</script>

<template>
  <div class="calendar">
    <header class="calendar-header">
      <p :key="`label-${gridTick}`" class="month-label" aria-live="polite">
        {{ monthLabel }}
      </p>
      <div class="month-nav">
        <button
          class="nav"
          type="button"
          aria-label="Previous month"
          @click="shiftMonth(-1)"
        >
          <ChevronLeftIcon class="nav-icon" aria-hidden="true" />
        </button>
        <button class="today" type="button" @click="goToToday">Today</button>
        <button
          class="nav"
          type="button"
          aria-label="Next month"
          @click="shiftMonth(1)"
        >
          <ChevronRightIcon class="nav-icon" aria-hidden="true" />
        </button>
      </div>
    </header>

    <table :key="gridTick" class="month">
      <caption class="sr-only">Content calendar, {{ monthLabel }}</caption>
      <thead>
        <tr>
          <th v-for="weekday in WEEKDAYS" :key="weekday" scope="col">
            {{ weekday }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
          <td
            v-for="(cell, colIndex) in row"
            :key="cell.iso"
            class="cell"
            :class="{
              outside: !cell.inMonth,
              today: cell.iso === todayIso,
            }"
            :style="{ '--col': colIndex, '--row': rowIndex }"
          >
            <div class="cell-head">
              <span class="day" :class="{ today: cell.iso === todayIso }">
                {{ cell.day }}
              </span>
              <button
                class="cell-add"
                type="button"
                :aria-label="`Plan content for ${cell.iso}`"
                @click="emit('new', cell.iso)"
              >
                <PlusIcon class="cell-add-icon" aria-hidden="true" />
              </button>
            </div>

            <button
              v-for="item in itemsByDate.get(cell.iso) ?? []"
              :key="item.id"
              class="chip"
              :class="item.status"
              type="button"
              :title="chipTitle(item)"
              @click="emit('edit', item)"
            >
              <span v-if="item.plannedTime" class="chip-time">
                {{ item.plannedTime }}
              </span>
              <span class="chip-title">{{ item.title }}</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.month-label {
  font-size: 14px;
  font-weight: 600;
  animation: label-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 7px;
  background: transparent;
  color: var(--muted-foreground);
  transition:
    color 150ms ease-out,
    border-color 150ms ease-out;
}

.nav:hover {
  border-color: var(--border);
  color: var(--foreground);
}

.nav:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.nav-icon {
  width: 14px;
  height: 14px;
}

.today {
  height: 28px;
  padding: 0 11px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 7px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 11px;
  transition:
    color 150ms ease-out,
    border-color 150ms ease-out;
}

.today:hover {
  border-color: var(--border);
  color: var(--foreground);
}

.today:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.month {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 3px;
}

.month th {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: left;
  color: var(--muted-foreground);
}

.cell {
  height: 96px;
  vertical-align: top;
  padding: 6px;
  border: 1px solid color-mix(in oklab, var(--border) 55%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--muted) 14%, transparent);
  animation: cell-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--col) * 24ms + var(--row) * 36ms);
}

.cell.outside {
  opacity: 0.45;
}

.cell.today {
  border-color: color-mix(in oklab, var(--foreground) 45%, transparent);
  background: color-mix(in oklab, var(--foreground) 5%, transparent);
}

.cell-head {
  display: flex;
  min-height: 18px;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.day {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--muted-foreground);
}

.day.today {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--foreground);
  color: var(--background);
}

.cell-add {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted-foreground);
  opacity: 0;
  transition:
    opacity 150ms ease-out,
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.cell:hover .cell-add,
.cell-add:focus-visible {
  opacity: 1;
}

.cell-add:hover {
  background: color-mix(in oklab, var(--muted) 60%, transparent);
  color: var(--foreground);
}

.cell-add:focus-visible {
  opacity: 1;
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.cell-add-icon {
  width: 12px;
  height: 12px;
}

.chip {
  display: flex;
  width: 100%;
  align-items: baseline;
  gap: 4px;
  margin-top: 3px;
  padding: 3px 6px;
  border: 0;
  border-left: 2px solid
    color-mix(in oklab, var(--muted-foreground) 70%, transparent);
  border-radius: 5px;
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  font-size: 10.5px;
  line-height: 1.35;
  text-align: left;
  animation: chip-in 360ms ease-out both;
  animation-delay: calc(var(--col) * 24ms + var(--row) * 36ms + 120ms);
  transition: background-color 150ms ease-out;
}

.chip:hover {
  background: color-mix(in oklab, var(--muted) 70%, transparent);
}

.chip:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.chip.drafted {
  border-left-color: color-mix(in oklab, var(--foreground) 65%, transparent);
}

.chip.published {
  border-left-color: var(--foreground);
  background: color-mix(in oklab, var(--foreground) 10%, transparent);
}

.chip-time {
  flex-shrink: 0;
  color: var(--muted-foreground);
}

.chip-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@keyframes cell-in {
  from {
    transform: translateY(6px);
  }
}

@keyframes chip-in {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes label-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell,
  .chip,
  .month-label {
    animation: none;
  }
}

@media (max-width: 640px) {
  .cell {
    height: 68px;
    padding: 4px;
  }

  .cell-add {
    opacity: 1;
  }

  .chip {
    padding: 2px 4px;
    font-size: 9.5px;
  }

  .month th {
    padding: 2px 2px;
  }
}
</style>
