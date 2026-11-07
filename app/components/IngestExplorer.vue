<script setup lang="ts">
import { InstagramIcon, Loader2Icon, RefreshCwIcon } from "lucide-vue-next";
import type { IngestJobRecord } from "~~/shared/types/ingest-pipeline";
import { ingestJobService } from "~/services/ingest-job.service";

const url = ref("");
const jobs = shallowRef<IngestJobRecord[]>([]);
const loading = ref(true);
const submitting = ref(false);
const error = ref<string | null>(null);

let pollTimer: ReturnType<typeof setInterval> | null = null;

const canSubmit = computed(
  () => url.value.trim().length > 0 && !submitting.value,
);

const activeCount = computed(
  () =>
    jobs.value.filter(
      (job) => job.status === "queued" || job.status === "processing",
    ).length,
);

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return "Unable to load the ingestion queue.";
}

async function refresh() {
  try {
    jobs.value = await ingestJobService.list();
    error.value = null;
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!canSubmit.value) return;

  submitting.value = true;
  error.value = null;

  try {
    const job = await ingestJobService.enqueueInstagram(url.value.trim());
    jobs.value = [job, ...jobs.value];
    url.value = "";
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    submitting.value = false;
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void refresh();
  }, 4000);
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

onMounted(() => {
  void refresh();
  startPolling();
});

onActivated(() => {
  if (pollTimer) return;
  void refresh();
  startPolling();
});

onDeactivated(stopPolling);
onBeforeUnmount(stopPolling);
</script>

<template>
  <section class="ingest">
    <header class="ingest-header">
      <div class="ingest-copy">
        <h1>Ingest</h1>
        <p>Queue public Instagram posts and reels for the ingestion agent.</p>
      </div>
      <button
        class="refresh"
        type="button"
        aria-label="Refresh queue"
        :disabled="loading"
        @click="refresh"
      >
        <RefreshCwIcon class="refresh-icon" :class="{ spin: loading }" />
      </button>
    </header>

    <div class="ingest-body">
      <div class="ingest-inner">
      <form class="queue-form" @submit.prevent="submit">
        <label class="field">
          <span>Public Instagram post or reel URL</span>
          <input
            v-model="url"
            type="url"
            placeholder="https://www.instagram.com/reel/..."
            autocomplete="off"
          />
        </label>
        <button class="primary" type="submit" :disabled="!canSubmit">
          <Loader2Icon v-if="submitting" class="icon spin" />
          <InstagramIcon v-else class="icon" />
          {{ submitting ? "Queueing..." : "Queue post" }}
        </button>
      </form>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div class="queue-header">
        <h2>Queue</h2>
        <span class="queue-count">
          {{ activeCount }} active · {{ jobs.length }} total
        </span>
      </div>

      <p v-if="loading && jobs.length === 0" class="state">
        Loading queue...
      </p>
      <p v-else-if="jobs.length === 0" class="state">
        No posts queued yet. Paste a public Instagram URL above.
      </p>

      <ul v-else class="jobs">
        <li v-for="job in jobs" :key="job.id" class="job">
          <div class="job-top">
            <span class="job-status" :data-status="job.status">
              {{ job.status }}
            </span>
            <a
              class="job-url"
              :href="job.sourceUrl"
              target="_blank"
              rel="noreferrer"
            >
              {{ job.sourceUrl }}
            </a>
          </div>

          <p class="job-meta">
            Queued {{ formatDate(job.createdAt) }}
            <template v-if="job.attempts > 0"> · attempt {{ job.attempts }}</template>
          </p>

          <p v-if="job.status === 'failed'" class="job-error">
            {{ job.error }}
          </p>

          <template v-else-if="job.result">
            <p class="job-summary">{{ job.result.summary }}</p>
            <p class="job-meta">
              {{ job.result.mediaType }} · {{ job.result.framesAnalyzed }} frames ·
              {{ job.result.transcriptCharacters }} transcript characters
            </p>
            <ul v-if="job.result.documents.length" class="docs">
              <li v-for="document in job.result.documents" :key="document.path">
                <span class="doc-action">{{ document.action }}</span>
                <span class="doc-path">{{ document.path }}</span>
              </li>
            </ul>
            <p v-else class="job-meta">Skipped: nothing worth saving.</p>
          </template>

          <p v-else class="job-meta">
            {{ job.status === "processing" ? "The agent is working on this post." : "Waiting for the worker." }}
          </p>
        </li>
      </ul>
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
  justify-content: space-between;
  gap: 16px;
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

.refresh {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
}

.refresh:hover {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.refresh-icon {
  width: 14px;
  height: 14px;
}

.ingest-body {
  min-width: 0;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.ingest-inner {
  display: flex;
  width: 100%;
  max-width: 760px;
  flex-direction: column;
  gap: 16px;
  margin: 0 auto;
  padding: 20px 16px 32px;
}

.queue-form {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.field {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

.field > span {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--muted-foreground);
}

.field input {
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

.field input:focus {
  border-color: var(--border);
}

.primary {
  display: inline-flex;
  height: 34px;
  flex-shrink: 0;
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

.icon.spin,
.refresh-icon.spin {
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

.queue-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid color-mix(in oklab, var(--border) 50%, transparent);
}

.queue-header h2 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.queue-count,
.state,
.job-meta {
  font-size: 11px;
  color: var(--muted-foreground);
}

.state {
  padding: 8px 0;
}

.jobs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--muted) 20%, transparent);
}

.job-top {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.job-status {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--muted) 55%, transparent);
  font-size: 11px;
  text-transform: capitalize;
}

.job-status[data-status="completed"] {
  color: var(--foreground);
}

.job-status[data-status="failed"] {
  color: var(--destructive);
}

.job-url {
  min-width: 0;
  overflow: hidden;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.job-summary {
  font-size: 12px;
  line-height: 1.55;
}

.job-error {
  font-size: 12px;
  line-height: 1.5;
  color: var(--destructive);
}

.docs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.docs li {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.doc-action {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--muted-foreground);
}

.doc-path {
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--foreground);
  overflow-wrap: anywhere;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon.spin,
  .refresh-icon.spin {
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

  .queue-form {
    flex-direction: column;
    align-items: stretch;
  }

  .primary {
    justify-content: center;
  }
}
</style>
