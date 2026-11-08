<script setup lang="ts">
import type { ScriptWithVersions } from "~~/shared/types/script";

const props = defineProps<{
  script?: ScriptWithVersions | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  (
    event: "save",
    input: { title: string; brand: string; content: string; note: string },
  ): void;
  (event: "cancel"): void;
}>();

const latest = computed(() => props.script?.versions[0] ?? null);

const title = ref(props.script?.title ?? "");
const brand = ref(props.script?.brand ?? "");
const content = ref(latest.value?.content ?? "");
const note = ref("");

const touched = ref(false);

const titleError = computed(() =>
  touched.value && title.value.trim().length === 0
    ? "A title is required."
    : null,
);

const contentError = computed(() =>
  touched.value && content.value.trim().length === 0
    ? "The script needs content."
    : null,
);

const canSave = computed(
  () => title.value.trim().length > 0 && content.value.trim().length > 0,
);

function save() {
  touched.value = true;
  if (!canSave.value) return;

  emit("save", {
    title: title.value.trim(),
    brand: brand.value.trim(),
    content: content.value,
    note: note.value.trim(),
  });
}
</script>

<template>
  <form class="editor" novalidate @submit.prevent="save">
    <div class="field">
      <label class="label" for="script-title">Title</label>
      <input
        id="script-title"
        v-model="title"
        class="input"
        type="text"
        placeholder="Cold brew launch reel"
        :aria-invalid="Boolean(titleError)"
        aria-describedby="script-title-error"
      />
      <p v-if="titleError" id="script-title-error" class="error" role="alert">
        {{ titleError }}
      </p>
    </div>

    <div class="field">
      <label class="label" for="script-brand">Brand</label>
      <input
        id="script-brand"
        v-model="brand"
        class="input"
        type="text"
        placeholder="Optional"
      />
    </div>

    <div class="field">
      <label class="label" for="script-content">Script</label>
      <textarea
        id="script-content"
        v-model="content"
        class="input content"
        rows="16"
        placeholder="Write the script in markdown. Use one beat per line: 0-2s | on-screen: ... | spoken: ..."
        :aria-invalid="Boolean(contentError)"
        aria-describedby="script-content-error"
      />
      <p v-if="contentError" id="script-content-error" class="error" role="alert">
        {{ contentError }}
      </p>
    </div>

    <div class="field">
      <label class="label" for="script-note">
        Note on this version
      </label>
      <input
        id="script-note"
        v-model="note"
        class="input"
        type="text"
        placeholder="What changed"
      />
    </div>

    <div class="editor-actions">
      <button class="primary" type="submit" :disabled="saving || !canSave">
        {{ saving ? "Saving" : script ? "Save as new version" : "Save script" }}
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

.content {
  min-height: 300px;
  resize: vertical;
  font-size: 13px;
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
