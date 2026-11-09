<script setup lang="ts">
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
} from "lucide-vue-next";
import { MarkdownRender } from "markstream-vue";
import type {
  StrategyInput,
  StrategyRecord,
} from "~~/shared/types/strategy";
import { strategyService } from "~/services/strategy.service";

const isDark = useIsDark();

const strategies = shallowRef<StrategyRecord[]>([]);
const loading = ref(true);
const saving = ref(false);
const switchingId = ref<string | null>(null);
const error = ref<string | null>(null);

const editing = ref<StrategyRecord | null>(null);
const creating = ref(false);
const formTitle = ref("");
const formContent = ref("");
const touched = ref(false);

const activeStrategy = computed(
  () => strategies.value.find((strategy) => strategy.isActive) ?? null,
);

const titleError = computed(() =>
  touched.value && formTitle.value.trim().length === 0
    ? "A title is required."
    : null,
);

const contentError = computed(() =>
  touched.value && formContent.value.trim().length === 0
    ? "The strategy content is required."
    : null,
);

const canSave = computed(
  () =>
    formTitle.value.trim().length > 0 && formContent.value.trim().length > 0,
);

function errorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  return "Unable to load the strategies. Please try again.";
}

async function load() {
  loading.value = true;
  error.value = null;

  try {
    strategies.value = await strategyService.list();
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function startCreate() {
  editing.value = null;
  creating.value = true;
  formTitle.value = "";
  formContent.value = "";
  touched.value = false;
}

function startEdit(strategy: StrategyRecord) {
  creating.value = false;
  editing.value = strategy;
  formTitle.value = strategy.title;
  formContent.value = strategy.content;
  touched.value = false;
}

function closeEditor() {
  creating.value = false;
  editing.value = null;
}

async function save() {
  touched.value = true;
  if (!canSave.value || saving.value) return;

  saving.value = true;
  error.value = null;

  const input: StrategyInput = {
    title: formTitle.value.trim(),
    content: formContent.value.trim(),
  };

  try {
    if (editing.value) {
      await strategyService.update(editing.value.id, input);
    } else {
      await strategyService.create(input);
    }

    closeEditor();
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    saving.value = false;
  }
}

async function activate(strategy: StrategyRecord) {
  if (strategy.isActive || switchingId.value) return;

  switchingId.value = strategy.id;
  error.value = null;

  try {
    const updated = await strategyService.update(strategy.id, {
      isActive: true,
    });
    strategies.value = strategies.value.map((existing) =>
      existing.id === updated.id ? updated : { ...existing, isActive: false },
    );
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    switchingId.value = null;
  }
}

async function remove(strategy: StrategyRecord) {
  if (!window.confirm(`Delete the strategy "${strategy.title}"?`)) return;

  error.value = null;

  try {
    await strategyService.remove(strategy.id);
    strategies.value = strategies.value.filter(
      (existing) => existing.id !== strategy.id,
    );
  } catch (cause) {
    error.value = errorMessage(cause);
  }
}

function preview(content: string): string {
  const flat = content.replace(/[#*`>]/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > 180 ? `${flat.slice(0, 180)}...` : flat;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
</script>

<template>
  <section class="strategy" aria-label="Content strategies">
    <form
      v-if="creating || editing"
      class="editor"
      novalidate
      @submit.prevent="save"
    >
      <h2 class="editor-heading">
        {{ editing ? "Edit strategy" : "New strategy" }}
      </h2>

      <div class="field">
        <label class="label" for="strategy-title">Title</label>
        <input
          id="strategy-title"
          v-model="formTitle"
          class="input"
          type="text"
          placeholder="Launch-month cadence"
          :aria-invalid="Boolean(titleError)"
          aria-describedby="strategy-title-error"
        />
        <p v-if="titleError" id="strategy-title-error" class="error" role="alert">
          {{ titleError }}
        </p>
      </div>

      <div class="field">
        <label class="label" for="strategy-content">
          The strategy, in markdown
        </label>
        <textarea
          id="strategy-content"
          v-model="formContent"
          class="input content-input"
          rows="14"
          placeholder="Cadence: ...
Platforms: ...
Priorities: ...
What to avoid: ..."
          :aria-invalid="Boolean(contentError)"
          aria-describedby="strategy-content-error"
        />
        <p v-if="contentError" id="strategy-content-error" class="error" role="alert">
          {{ contentError }}
        </p>
        <p class="hint">
          Name the cadence, the platforms, the priorities, and what to avoid.
          The agent reads the active strategy before it plans.
        </p>
      </div>

      <div class="editor-actions">
        <button class="primary" type="submit" :disabled="saving || !canSave">
          {{ saving ? "Saving" : editing ? "Save changes" : "Save strategy" }}
        </button>
        <button class="secondary" type="button" :disabled="saving" @click="closeEditor">
          Cancel
        </button>
      </div>
    </form>

    <template v-else>
      <header class="strategy-toolbar">
        <div class="strategy-copy">
          <h2>Strategy</h2>
          <p v-if="activeStrategy" class="strategy-sub">
            The agent follows
            <strong>{{ activeStrategy.title }}</strong>
            when it plans.
          </p>
          <p v-else class="strategy-sub">
            No active strategy. Add one so the agent has a plan to follow.
          </p>
        </div>
        <button class="primary" type="button" @click="startCreate">
          <PlusIcon class="icon" aria-hidden="true" />
          New strategy
        </button>
      </header>

      <p v-if="loading" class="state">Loading strategies...</p>

      <template v-else>
        <p v-if="strategies.length === 0" class="state">
          No strategy yet. Write the first one: how often to post, where, and
          what to prioritize.
        </p>

        <div v-else class="strategy-list">
          <article
            v-for="(strategy, index) in strategies"
            :key="strategy.id"
            class="strategy-card"
            :class="{ active: strategy.isActive }"
            :style="{ '--entry': index }"
          >
            <header class="card-head">
              <h3 class="card-title">{{ strategy.title }}</h3>
              <span v-if="strategy.isActive" class="active-badge">
                <CheckIcon class="active-icon" aria-hidden="true" />
                Active
              </span>
            </header>

            <p class="card-meta">Updated {{ formatDate(strategy.updatedAt) }}</p>

            <MarkdownRender
              v-if="strategy.isActive"
              class="card-content"
              :content="strategy.content"
              mode="chat"
              :final="true"
              :fade="false"
              :is-dark="isDark"
            />
            <p v-else class="card-preview">{{ preview(strategy.content) }}</p>

            <footer class="card-actions">
              <button
                v-if="!strategy.isActive"
                class="card-action"
                type="button"
                :disabled="switchingId === strategy.id"
                @click="activate(strategy)"
              >
                <TargetIcon class="action-icon" aria-hidden="true" />
                {{ switchingId === strategy.id ? "Activating" : "Set active" }}
              </button>
              <button
                class="card-action"
                type="button"
                @click="startEdit(strategy)"
              >
                <PencilIcon class="action-icon" aria-hidden="true" />
                Edit
              </button>
              <button
                class="card-action danger"
                type="button"
                @click="remove(strategy)"
              >
                <TrashIcon class="action-icon" aria-hidden="true" />
                Delete
              </button>
            </footer>
          </article>
        </div>
      </template>
    </template>
  </section>
</template>

<style scoped>
.strategy {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 860px;
  padding: 20px 24px 32px;
}

.strategy-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  animation: toolbar-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.strategy-copy h2 {
  font-size: 14px;
  font-weight: 500;
}

.strategy-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.strategy-sub strong {
  font-weight: 500;
  color: var(--foreground);
}

.state {
  font-size: 13px;
  color: var(--muted-foreground);
}

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.strategy-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in oklab, var(--card) 45%, var(--background));
  animation: card-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--entry) * 70ms);
}

.strategy-card.active {
  border-color: color-mix(in oklab, var(--foreground) 28%, transparent);
  background: color-mix(in oklab, var(--card) 70%, var(--background));
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
  animation: title-in 260ms ease-out both;
  animation-delay: calc(var(--entry) * 70ms + 60ms);
}

.active-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid color-mix(in oklab, var(--foreground) 25%, transparent);
  border-radius: 999px;
  background: color-mix(in oklab, var(--foreground) 8%, transparent);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--foreground);
  animation: badge-in 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--entry) * 70ms + 120ms);
}

.active-icon {
  width: 10px;
  height: 10px;
}

.card-meta {
  font-size: 11px;
  color: var(--muted-foreground);
}

.card-content {
  min-width: 0;
  font-size: 13.5px;
  line-height: 1.6;
  animation: content-in 420ms ease-out both;
  animation-delay: calc(var(--entry) * 70ms + 100ms);
}

.card-preview {
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted-foreground);
  animation: content-in 420ms ease-out both;
  animation-delay: calc(var(--entry) * 70ms + 100ms);
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 4px;
  animation: actions-in 380ms ease-out both;
  animation-delay: calc(var(--entry) * 70ms + 180ms);
}

.card-action {
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

.card-action:hover:not(:disabled) {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.card-action:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.card-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.card-action.danger:hover {
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
}

.action-icon {
  width: 12px;
  height: 12px;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 720px;
  animation: editor-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.editor-heading {
  font-size: 14px;
  font-weight: 500;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--muted-foreground);
}

.input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 7px;
  background: color-mix(in oklab, var(--muted) 18%, transparent);
  color: var(--foreground);
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  transition: border-color 150ms ease-out;
}

.input:focus {
  border-color: color-mix(in oklab, var(--foreground) 35%, transparent);
}

.input[aria-invalid="true"] {
  border-color: color-mix(in oklab, var(--destructive) 55%, transparent);
}

.content-input {
  min-height: 240px;
  resize: vertical;
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.error {
  font-size: 11.5px;
  color: var(--destructive);
}

.hint {
  font-size: 11.5px;
  color: var(--muted-foreground);
}

.editor-actions {
  display: flex;
  gap: 8px;
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
  cursor: pointer;
  transition: opacity 150ms ease-out;
}

.primary:hover:not(:disabled) {
  opacity: 0.9;
}

.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.secondary {
  display: inline-flex;
  height: 32px;
  align-items: center;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 12.5px;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.secondary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.icon {
  width: 13px;
  height: 13px;
}

@keyframes toolbar-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@keyframes title-in {
  from {
    opacity: 0;
  }
}

@keyframes badge-in {
  from {
    opacity: 0;
    transform: scale(0.86);
  }
}

@keyframes content-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

@keyframes actions-in {
  from {
    opacity: 0;
  }
}

@keyframes editor-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .strategy-toolbar,
  .strategy-card,
  .card-title,
  .active-badge,
  .card-content,
  .card-preview,
  .card-actions,
  .editor {
    animation: none;
  }
}

@media (max-width: 767px) {
  .strategy {
    padding: 16px;
  }

  .strategy-toolbar {
    flex-direction: column;
  }
}
</style>
