<script setup lang="ts">
import { InboxIcon, InstagramIcon, Loader2Icon } from "lucide-vue-next";
import type { IngestFolder, IngestResult } from "~~/shared/types/ingest";
import type { IngestJobRecord } from "~~/shared/types/ingest-pipeline";
import { ingestService } from "~/services/ingest.service";
import { ingestJobService } from "~/services/ingest-job.service";

const mode = ref<"text" | "url" | "instagram">("text");
const title = ref("");
const content = ref("");
const url = ref("");
const instagramUrl = ref("");
const folder = ref<IngestFolder>("arsenal");
const submitting = ref(false);
const error = ref<string | null>(null);
const result = ref<IngestResult | null>(null);
const job = ref<IngestJobRecord | null>(null);

let jobTimer: ReturnType<typeof setInterval> | null = null;

const isJobActive = computed(
  () => job.value?.status === "queued" || job.value?.status === "processing",
);

const canSubmit = computed(() => {
  if (submitting.value || isJobActive.value) return false;

  if (mode.value === "text") {
    return title.value.trim().length > 0 && content.value.trim().length > 0;
  }

  if (mode.value === "url") return url.value.trim().length > 0;
  return instagramUrl.value.trim().length > 0;
});

function clearJobTimer() {
  if (jobTimer) clearInterval(jobTimer);
  jobTimer = null;
}

function switchMode(next: "text" | "url" | "instagram") {
  mode.value = next;
  error.value = null;
  result.value = null;
  job.value = null;
  clearJobTimer();
}

async function submit() {
  if (!canSubmit.value) return;

  if (mode.value === "instagram") {
    await submitInstagram();
    return;
  }

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

async function submitInstagram() {
  submitting.value = true;
  error.value = null;
  result.value = null;
  job.value = null;

  try {
    job.value = await ingestJobService.enqueueInstagram(
      instagramUrl.value.trim(),
    );
    instagramUrl.value = "";
    startPolling();
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : "Unable to queue that Instagram URL.";
  } finally {
    submitting.value = false;
  }
}

function startPolling() {
  clearJobTimer();

  jobTimer = setInterval(async () => {
    if (!job.value) {
      clearJobTimer();
      return;
    }

    try {
      job.value = await ingestJobService.get(job.value.id);
      if (job.value.status === "completed" || job.value.status === "failed") {
        clearJobTimer();
      }
    } catch {
      clearJobTimer();
    }
  }, 3000);
}

onBeforeUnmount(clearJobTimer);
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
        <button
          class="mode-button"
          :class="{ active: mode === 'instagram' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'instagram'"
          @click="switchMode('instagram')"
        >
          Instagram
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

        <label v-else-if="mode === 'url'" class="field">
          <span>URL</span>
          <input
            v-model="url"
            type="url"
            placeholder="https://example.com/article"
          />
        </label>

        <label v-else class="field">
          <span>Public Instagram post or reel URL</span>
          <input
            v-model="instagramUrl"
            type="url"
            placeholder="https://www.instagram.com/reel/..."
          />
        </label>

        <label v-if="mode !== 'instagram'" class="field folder-field">
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
            <InstagramIcon v-else-if="mode === 'instagram'" class="icon" />
            <InboxIcon v-else class="icon" />
            {{ submitting ? "Working..." : mode === "instagram" ? "Queue ingestion" : "Ingest" }}
          </button>
        </div>
      </form>

      <div v-if="job" class="job">
        <div class="job-top">
          <span class="job-status" :data-status="job.status">{{ job.status }}</span>
          <span class="job-id">{{ job.id }}</span>
        </div>
        <p v-if="job.status === 'failed'" class="job-error">{{ job.error }}</p>
        <template v-else-if="job.result">
          <p class="job-summary">{{ job.result.summary }}</p>
          <p class="job-meta">
            {{ job.result.mediaType }} · {{ job.result.framesAnalyzed }} frames ·
            {{ job.result.transcriptCharacters }} transcript characters
          </p>
          <ul v-if="job.result.documents.length" class="job-docs">
            <li v-for="document in job.result.documents" :key="document.path">
              <span class="job-doc-action">{{ document.action }}</span>
              <span class="job-doc-path">{{ document.path }}</span>
            </li>
          </ul>
          <p v-else class="job-meta">No documents were written.</p>
        </template>
        <p v-else class="job-meta">The worker is processing this source.</p>
      </div>

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

.result,
.job {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--muted) 22%, transparent);
}

.result-title,
.job-summary {
  font-size: 12px;
  font-weight: 600;
}

.result-path,
.job-doc-path,
.job-id {
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 12px;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

.result-meta,
.job-meta {
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

.job-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.job-status {
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--muted) 55%, transparent);
  font-size: 11px;
  text-transform: capitalize;
}

.job-status[data-status="completed"] {
  color: var(--foreground);
}

.job-status[data-status="failed"],
.job-error {
  color: var(--destructive);
}

.job-error {
  font-size: 12px;
  line-height: 1.5;
}

.job-docs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.job-docs li {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.job-doc-action {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--muted-foreground);
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
