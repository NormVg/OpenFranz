<script setup lang="ts">
import type { ScriptRecord } from "~~/shared/types/script";
import type { PlannerItemInput, PlannerItemRecord } from "~~/shared/types/plan";
import type { PlanPlatform, PlanStatus } from "~~/shared/utils/plan";
import {
  PLAN_PLATFORM_LABELS,
  PLAN_PLATFORMS,
  PLAN_STATUSES,
  PLAN_STATUS_LABELS,
} from "~~/shared/utils/plan";

const props = defineProps<{
  item?: PlannerItemRecord | null;
  defaultDate?: string;
  scripts: ScriptRecord[];
  saving: boolean;
}>();

const emit = defineEmits<{
  (event: "save", input: PlannerItemInput): void;
  (event: "cancel"): void;
}>();

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const title = ref(props.item?.title ?? "");
const platform = ref<string>(props.item?.platform ?? "instagram");
const format = ref(props.item?.format ?? "");
const brand = ref(props.item?.brand ?? "");
const plannedDate = ref(
  props.item?.plannedDate ?? props.defaultDate ?? todayIso(),
);
const plannedTime = ref(props.item?.plannedTime ?? "");
const status = ref<string>(props.item?.status ?? "planned");
const rationale = ref(props.item?.rationale ?? "");
const scriptId = ref<string>(props.item?.scriptId ?? "");

const touched = ref(false);

const titleError = computed(() =>
  touched.value && title.value.trim().length === 0
    ? "A title is required."
    : null,
);

const dateError = computed(() =>
  touched.value && plannedDate.value.trim().length === 0
    ? "Pick a date."
    : null,
);

const canSave = computed(
  () =>
    title.value.trim().length > 0 && plannedDate.value.trim().length > 0,
);

function save() {
  touched.value = true;
  if (!canSave.value) return;

  emit("save", {
    title: title.value.trim(),
    platform: platform.value as PlanPlatform,
    format: format.value.trim(),
    brand: brand.value.trim(),
    plannedDate: plannedDate.value,
    plannedTime: plannedTime.value.trim(),
    status: status.value as PlanStatus,
    rationale: rationale.value.trim(),
    scriptId: scriptId.value || null,
  });
}
</script>

<template>
  <form class="editor" novalidate @submit.prevent="save">
    <div class="field">
      <label class="label" for="plan-title">Title</label>
      <input
        id="plan-title"
        v-model="title"
        class="input"
        type="text"
        placeholder="Cold brew launch reel"
        :aria-invalid="Boolean(titleError)"
        aria-describedby="plan-title-error"
      />
      <p v-if="titleError" id="plan-title-error" class="error" role="alert">
        {{ titleError }}
      </p>
    </div>

    <div class="field-row">
      <div class="field">
        <label class="label" for="plan-platform">Platform</label>
        <select id="plan-platform" v-model="platform" class="input">
          <option v-for="option in PLAN_PLATFORMS" :key="option" :value="option">
            {{ PLAN_PLATFORM_LABELS[option] }}
          </option>
        </select>
      </div>

      <div class="field">
        <label class="label" for="plan-format">Format</label>
        <input
          id="plan-format"
          v-model="format"
          class="input"
          type="text"
          list="plan-formats"
          placeholder="Reel"
        />
        <datalist id="plan-formats">
          <option value="Reel"></option>
          <option value="Post"></option>
          <option value="Carousel"></option>
          <option value="Story"></option>
          <option value="Long-form"></option>
          <option value="Short"></option>
        </datalist>
      </div>

      <div class="field">
        <label class="label" for="plan-brand">Brand</label>
        <input
          id="plan-brand"
          v-model="brand"
          class="input"
          type="text"
          placeholder="Optional"
        />
      </div>
    </div>

    <div class="field-row">
      <div class="field">
        <label class="label" for="plan-date">Date</label>
        <input
          id="plan-date"
          v-model="plannedDate"
          class="input"
          type="date"
          :aria-invalid="Boolean(dateError)"
          aria-describedby="plan-date-error"
        />
        <p v-if="dateError" id="plan-date-error" class="error" role="alert">
          {{ dateError }}
        </p>
      </div>

      <div class="field">
        <label class="label" for="plan-time">Time hint</label>
        <input
          id="plan-time"
          v-model="plannedTime"
          class="input"
          type="text"
          placeholder="19:00 or weekday evening"
        />
      </div>

      <div class="field">
        <label class="label" for="plan-status">Status</label>
        <select id="plan-status" v-model="status" class="input">
          <option v-for="option in PLAN_STATUSES" :key="option" :value="option">
            {{ PLAN_STATUS_LABELS[option] }}
          </option>
        </select>
      </div>
    </div>

    <div class="field">
      <label class="label" for="plan-script">Script from the library</label>
      <select id="plan-script" v-model="scriptId" class="input">
        <option value="">None</option>
        <option v-for="script in scripts" :key="script.id" :value="script.id">
          {{ script.title }}
        </option>
      </select>
    </div>

    <div class="field">
      <label class="label" for="plan-rationale">
        Why this day and slot works
      </label>
      <textarea
        id="plan-rationale"
        v-model="rationale"
        class="input"
        rows="3"
        placeholder="One line naming the mechanism or source"
      />
    </div>

    <div class="editor-actions">
      <button class="primary" type="submit" :disabled="saving || !canSave">
        {{ saving ? "Saving" : item ? "Save changes" : "Add to plan" }}
      </button>
      <button class="secondary" type="button" :disabled="saving" @click="emit('cancel')">
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 720px;
  padding: 20px 24px 32px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
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

.error {
  font-size: 11.5px;
  color: var(--destructive);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.primary {
  display: inline-flex;
  height: 32px;
  align-items: center;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: var(--foreground);
  color: var(--background);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 150ms ease-out;
}

.primary:hover:not(:disabled) {
  opacity: 0.88;
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

@media (max-width: 767px) {
  .editor {
    padding: 16px;
  }
}
</style>
