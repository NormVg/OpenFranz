<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import type { ScriptRecord } from "~~/shared/types/script";
import type {
  PlannerItemInput,
  PlannerItemRecord,
} from "~~/shared/types/plan";
import type { PlanStatus } from "~~/shared/utils/plan";
import { groupPlannerItems } from "~~/shared/utils/plan";
import { planService } from "~/services/plan.service";
import { scriptService } from "~/services/script.service";

const items = shallowRef<PlannerItemRecord[]>([]);
const scripts = shallowRef<ScriptRecord[]>([]);
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

onMounted(load);

function startCreate() {
  creating.value = true;
  editing.value = null;
}

function startEdit(item: PlannerItemRecord) {
  editing.value = item;
  creating.value = false;
}

function cancel() {
  creating.value = false;
  editing.value = null;
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
      <button class="primary" type="button" @click="startCreate">
        <PlusIcon class="icon" aria-hidden="true" />
        New item
      </button>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="planner-body">
      <div class="planner-pane">
        <p v-if="loading" class="state">Loading the plan...</p>

        <template v-else>
          <PlannerItemEditor
            v-if="creating || editing"
            :item="editing"
            :scripts="scripts"
            :saving="saving"
            @save="save"
            @cancel="cancel"
          />

          <PlannerBoard
            v-else
            :groups="groups"
            :scripts="scripts"
            @edit="startEdit"
            @remove="remove"
            @cycle="cycleStatus"
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
  }

  .planner-pane {
    padding: 16px;
  }
}
</style>
