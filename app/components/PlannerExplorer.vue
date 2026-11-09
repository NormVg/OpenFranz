<script setup lang="ts">
import {
  CalendarDaysIcon,
  LayoutListIcon,
  PlusIcon,
  TargetIcon,
} from "lucide-vue-next";
import type { ScriptRecord } from "~~/shared/types/script";
import type {
  PlannerItemInput,
  PlannerItemRecord,
} from "~~/shared/types/plan";
import type { PlanStatus } from "~~/shared/utils/plan";
import { groupPlannerItems } from "~~/shared/utils/plan";
import { planService } from "~/services/plan.service";
import { scriptService } from "~/services/script.service";

const PLANNER_VIEW_KEY = "openfranz:planner-view";
const PLANNER_VIEWS = ["weeks", "calendar", "strategy"] as const;
type PlannerView = (typeof PLANNER_VIEWS)[number];

const items = shallowRef<PlannerItemRecord[]>([]);
const scripts = shallowRef<ScriptRecord[]>([]);
const view = ref<PlannerView>("weeks");
const defaultDate = ref<string | undefined>();
const editing = ref<PlannerItemRecord | null>(null);
const creating = ref(false);
const loading = ref(true);
const saving = ref(false);
const cycling = ref<string | null>(null);
const error = ref<string | null>(null);

const groups = computed(() => {
  const today = new Date().toISOString().slice(0, 10);
  return groupPlannerItems(items.value, today);
});

const thisWeekCount = computed(
  () => groups.value.find((group) => group.id === "thisWeek")?.items.length ?? 0,
);

const draftedCount = computed(
  () => items.value.filter((item) => item.status === "drafted").length,
);

const publishedCount = computed(
  () => items.value.filter((item) => item.status === "published").length,
);

function localTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  return "Unable to load the plan. Please try again.";
}

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const [planned, library] = await Promise.all([
      planService.list(),
      scriptService.list(),
    ]);

    items.value = planned;
    scripts.value = library;
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const saved = window.localStorage.getItem(PLANNER_VIEW_KEY);
  if (saved === "weeks" || saved === "calendar" || saved === "strategy") {
    view.value = saved;
  }

  void load();
});

watch(view, (next) => {
  window.localStorage.setItem(PLANNER_VIEW_KEY, next);
});

function startCreate(date?: string) {
  defaultDate.value = date;
  creating.value = true;
  editing.value = null;
}

function startEdit(item: PlannerItemRecord) {
  editing.value = item;
  creating.value = false;
  defaultDate.value = undefined;
}

function cancel() {
  creating.value = false;
  editing.value = null;
  defaultDate.value = undefined;
}

async function save(input: PlannerItemInput) {
  saving.value = true;
  error.value = null;

  try {
    if (editing.value) {
      await planService.update(editing.value.id, input);
    } else {
      await planService.create(input);
    }

    creating.value = false;
    editing.value = null;
    defaultDate.value = undefined;
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    saving.value = false;
  }
}

async function cycleStatus(item: PlannerItemRecord) {
  if (cycling.value) return;

  const order: PlanStatus[] = ["planned", "drafted", "published"];
  const next = order[(order.indexOf(item.status) + 1) % order.length];

  cycling.value = item.id;
  error.value = null;

  try {
    const updated = await planService.update(item.id, { status: next });
    items.value = items.value.map((existing) =>
      existing.id === updated.id ? updated : existing,
    );
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    cycling.value = null;
  }
}

async function remove(item: PlannerItemRecord) {
  if (!window.confirm(`Remove ${item.title} from the plan?`)) return;

  error.value = null;

  try {
    await planService.remove(item.id);
    items.value = items.value.filter((existing) => existing.id !== item.id);
    if (editing.value?.id === item.id) {
      editing.value = null;
    }
  } catch (cause) {
    error.value = errorMessage(cause);
  }
}
</script>

<template>
  <section class="planner">
    <header class="planner-header">
      <div class="planner-copy">
        <h1>Content plan</h1>
        <div class="stats">
          <span class="stat">
            <strong>{{ thisWeekCount }}</strong>
            this week
          </span>
          <span class="stat">
            <strong>{{ draftedCount }}</strong>
            drafted
          </span>
          <span class="stat">
            <strong>{{ publishedCount }}</strong>
            published
          </span>
        </div>
      </div>
      <div class="header-actions">
        <div class="view-switch" role="tablist" aria-label="Planner view">
          <button
            class="view-button"
            :class="{ active: view === 'weeks' }"
            type="button"
            role="tab"
            :aria-selected="view === 'weeks'"
            @click="view = 'weeks'"
          >
            <LayoutListIcon class="view-icon" aria-hidden="true" />
            Weeks
          </button>
          <button
            class="view-button"
            :class="{ active: view === 'calendar' }"
            type="button"
            role="tab"
            :aria-selected="view === 'calendar'"
            @click="view = 'calendar'"
          >
            <CalendarDaysIcon class="view-icon" aria-hidden="true" />
            Calendar
          </button>
          <button
            class="view-button"
            :class="{ active: view === 'strategy' }"
            type="button"
            role="tab"
            :aria-selected="view === 'strategy'"
            @click="view = 'strategy'"
          >
            <TargetIcon class="view-icon" aria-hidden="true" />
            Strategy
          </button>
        </div>
        <button
          v-if="view !== 'strategy'"
          class="primary"
          type="button"
          @click="startCreate()"
        >
          <PlusIcon class="icon" aria-hidden="true" />
          New item
        </button>
      </div>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="planner-body">
      <div class="planner-pane">
        <p v-if="loading" class="state">Loading the plan...</p>

        <template v-else>
          <PlannerItemEditor
            v-if="creating || editing"
            :item="editing"
            :default-date="defaultDate"
            :scripts="scripts"
            :saving="saving"
            @save="save"
            @cancel="cancel"
          />

          <PlannerBoard
            v-else-if="view === 'weeks'"
            :groups="groups"
            :scripts="scripts"
            @edit="startEdit"
            @remove="remove"
            @cycle="cycleStatus"
          />

          <PlannerStrategy v-else-if="view === 'strategy'" />

          <PlannerCalendar
            v-else
            :items="items"
            :today-iso="localTodayIso()"
            @edit="startEdit"
            @new="startCreate"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.planner {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.planner-header {
  display: flex;
  min-height: 64px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.planner-copy {
  min-width: 0;
}

.planner-copy h1 {
  font-size: 14px;
  font-weight: 500;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.stat {
  font-size: 11px;
  color: var(--muted-foreground);
}

.stat strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground);
}

.primary {
  display: inline-flex;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: var(--foreground);
  color: var(--background);
  font-size: 12px;
  font-weight: 500;
  transition: opacity 150ms ease-out;
}

.primary:hover {
  opacity: 0.9;
}

.icon {
  width: 13px;
  height: 13px;
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
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

.planner-body {
  display: flex;
  min-height: 0;
  flex: 1;
}

.planner-pane {
  min-width: 0;
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px 32px;
}

.state {
  font-size: 13px;
  color: var(--muted-foreground);
}

.error {
  margin: 12px 16px 0;
  padding: 8px 12px;
  border: 1px solid color-mix(in oklab, var(--destructive) 35%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  font-size: 13px;
  line-height: 1.5;
  color: var(--destructive);
}

@media (max-width: 767px) {
  .planner-header {
    min-height: 56px;
    flex-wrap: wrap;
    padding-block: 8px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .planner-pane {
    padding: 16px;
  }
}
</style>
