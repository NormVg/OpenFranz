<script setup lang="ts">
import { InboxIcon, Loader2Icon } from "lucide-vue-next";
import type { IngestFolder, IngestResult } from "~~/shared/types/ingest";
import { ingestService } from "~/services/ingest.service";

const mode = ref<"text" | "url">("text");
const title = ref("");
const content = ref("");
const url = ref("");
const folder = ref<IngestFolder>("arsenal");
const submitting = ref(false);
const error = ref<string | null>(null);
const result = ref<IngestResult | null>(null);

const canSubmit = computed(() => {
  if (submitting.value) return false;

  if (mode.value === "text") {
    return title.value.trim().length > 0 && content.value.trim().length > 0;
  }

  return url.value.trim().length > 0;
});

function switchMode(next: "text" | "url") {
  mode.value = next;
  error.value = null;
  result.value = null;
}

async function submit() {
  if (!canSubmit.value) return;

  submitting.value = true;
  error.value = null;
  result.value = null;

  try {
    result.value = await ingestService.run(
      mode.value === "text"
        ? {
            kind: "text",
            title: title.value.trim(),
            content: content.value,
            folder: folder.value,
          }
        : { kind: "url", url: url.value.trim(), folder: folder.value },
    );

    if (mode.value === "text") {
      title.value = "";
      content.value = "";
    } else {
      url.value = "";
    }
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : "Unable to ingest that source.";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="ingest">
    <header class="ingest-header">
      <div class="ingest-copy">
        <h1>Ingest</h1>
        <p>Add source material to the shared workspace.</p>
      </div>
    </header>

    <div class="ingest-body">
      <div class="mode-switch" role="tablist" aria-label="Source type">
        <button
          class="mode-button"
          :class="{ active: mode === 'text' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'text'"
          @click="switchMode('text')"
        >
          Text
        </button>
        <button
          class="mode-button"
          :class="{ active: mode === 'url' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'url'"
          @click="switchMode('url')"
        >
          URL
        </button>
      </div>

      <form class="form" @submit.prevent="submit">
        <template v-if="mode === 'text'">
          <label class="field">
            <span>Title</span>
            <input
              v-model="title"
              type="text"
              maxlength="120"
              placeholder="Q4 launch brief"
            />
          </label>
          <label class="field">
            <span>Content</span>
            <textarea
              v-model="content"
              rows="12"
              placeholder="Paste the source material..."
            />
          </label>
        </template>

        <label v-else class="field">
          <span>URL</span>
          <input
            v-model="url"
            type="url"
            placeholder="https://example.com/article"
          />
        </label>

        <label class="field folder-field">
          <span>Folder</span>
          <select v-model="folder">
            <option value="arsenal">/arsenal</option>
            <option value="knowledge">/knowledge</option>
          </select>
        </label>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <div class="actions">
          <button class="primary" type="submit" :disabled="!canSubmit">
            <Loader2Icon v-if="submitting" class="icon spin" />
            <InboxIcon v-else class="icon" />
            {{ submitting ? "Ingesting..." : "Ingest" }}
          </button>
        </div>
      </form>

      <div v-if="result" class="result">
        <p class="result-title">Saved to the workspace</p>
        <p class="result-path">{{ result.path }}</p>
        <p class="result-meta">
          {{ result.characters.toLocaleString() }} characters
        </p>
        <NuxtLink class="result-link" to="/app?view=files">
          Open in Files
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ingest {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.ingest-header {
  display: flex;
  min-height: 64px;
  flex-shrink: 0;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.ingest-copy h1 {
  font-size: 14px;
  font-weight: 500;
}

.ingest-copy p {
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted-foreground);
}

.ingest-body {
  display: flex;
  width: 100%;
  max-width: 720px;
  flex-direction: column;
  gap: 16px;
  margin: 0 auto;
  padding: 20px 16px 32px;
  overflow-y: auto;
}

.mode-switch {
  display: flex;
  align-self: flex-start;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: color-mix(in oklab, var(--muted) 35%, transparent);
}

.mode-button {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 12px;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.mode-button:hover,
.mode-button.active {
  background: color-mix(in oklab, var(--card) 85%, transparent);
  color: var(--foreground);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field > span {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--muted-foreground);
}

.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 7px;
  background: color-mix(in oklab, var(--muted) 18%, transparent);
  color: var(--foreground);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
}

.field textarea {
  resize: vertical;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: var(--border);
}

.folder-field {
  max-width: 200px;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.primary {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: var(--foreground);
  color: var(--background);
  font-size: 12px;
  font-weight: 500;
  transition: opacity 150ms ease-out;
}

.primary:disabled {
  opacity: 0.4;
}

.icon {
  width: 13px;
  height: 13px;
}

.icon.spin {
  animation: spin 1s linear infinite;
}

.error {
  padding: 8px 12px;
  border: 1px solid color-mix(in oklab, var(--destructive) 35%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  font-size: 13px;
  line-height: 1.5;
  color: var(--destructive);
}

.result {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--muted) 22%, transparent);
}

.result-title {
  font-size: 12px;
  font-weight: 600;
}

.result-path {
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 12px;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.result-meta {
  font-size: 11px;
  color: var(--muted-foreground);
}

.result-link {
  align-self: flex-start;
  margin-top: 4px;
  font-size: 12px;
  color: var(--foreground);
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 3px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon.spin {
    animation: none;
  }
}

@media (max-width: 640px) {
  .ingest-header {
    min-height: 56px;
  }

  .ingest-copy p {
    display: none;
  }
}
</style>
