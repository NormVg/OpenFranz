<script setup lang="ts">
import {
  ArrowRightIcon,
  BookmarkPlusIcon,
  CheckIcon,
  CopyIcon,
  TagIcon,
} from "lucide-vue-next";
import { MarkdownRender } from "markstream-vue";
import { scriptService } from "~/services/script.service";
import { parseScriptContent } from "~~/shared/utils/script-block";

const props = defineProps<{
  title: string | null;
  brand: string | null;
  content: string;
  streaming?: boolean;
  isDark: boolean;
}>();

const blocks = computed(() => parseScriptContent(props.content));

const copied = ref(false);
const saveState = ref<"idle" | "saving" | "saved" | "error">("idle");
const savedId = ref<string | null>(null);

let copyTimer: ReturnType<typeof setTimeout> | null = null;

async function copyContent() {
  if (!props.content) return;

  try {
    await navigator.clipboard.writeText(props.content);
    copied.value = true;

    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
}

async function saveToLibrary() {
  if (props.streaming) return;
  if (saveState.value === "saving" || saveState.value === "saved") return;

  saveState.value = "saving";

  try {
    const saved = await scriptService.create({
      title: props.title?.trim() || "Untitled script",
      brand: props.brand ?? "",
      content: props.content,
      note: "Saved from chat.",
    });

    savedId.value = saved.id;
    saveState.value = "saved";
  } catch {
    saveState.value = "error";
  }
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer);
});
</script>

<template>
  <article class="script-card" aria-label="Script">
    <header class="script-head">
      <div class="script-meta">
        <span class="script-eyebrow">
          Script
          <span v-if="streaming" class="script-live">writing</span>
        </span>
        <h4 class="script-title">{{ title || "Untitled script" }}</h4>
      </div>
      <span v-if="brand" class="script-brand">
        <TagIcon class="script-brand-icon" aria-hidden="true" />
        {{ brand }}
      </span>
    </header>

    <div class="script-body">
      <template v-for="(block, index) in blocks" :key="index">
        <div v-if="block.type === 'heading'" class="script-heading">
          {{ block.text }}
        </div>
        <ScriptBeats v-else-if="block.type === 'beats'" :beats="block.beats" />
        <MarkdownRender
          v-else
          class="script-markdown"
          :content="block.text"
          mode="chat"
          :final="true"
          :fade="false"
          :is-dark="isDark"
        />
      </template>
    </div>

    <footer class="script-actions">
      <button class="action" type="button" @click="copyContent">
        <CheckIcon v-if="copied" class="action-icon" aria-hidden="true" />
        <CopyIcon v-else class="action-icon" aria-hidden="true" />
        {{ copied ? "Copied" : "Copy" }}
      </button>

      <template v-if="saveState === 'saved'">
        <span class="saved-note">Saved to Scripts</span>
        <NuxtLink class="action" :to="`/app?view=scripts&script=${savedId}`">
          Open
          <ArrowRightIcon class="action-icon" aria-hidden="true" />
        </NuxtLink>
      </template>
      <button
        v-else
        class="action save"
        type="button"
        :disabled="streaming || saveState === 'saving'"
        @click="saveToLibrary"
      >
        <BookmarkPlusIcon class="action-icon" aria-hidden="true" />
        {{ saveState === "saving" ? "Saving" : "Save to Scripts" }}
      </button>

      <span v-if="saveState === 'error'" class="save-error" role="alert">
        Could not save. Try again.
      </span>
    </footer>
  </article>
</template>

<style scoped>
.script-card {
  margin: 6px 0;
  overflow: hidden;
  border: 1px solid color-mix(in oklab, var(--border) 86%, var(--foreground) 14%);
  border-radius: 12px;
  background: color-mix(in oklab, var(--card) 78%, var(--background));
  animation: card-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.script-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  animation: head-in 300ms cubic-bezier(0.22, 1, 0.36, 1) 40ms both;
}

.script-meta {
  min-width: 0;
}

.script-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.script-live {
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: none;
  animation: live-pulse 1.6s ease-in-out infinite;
}

.script-title {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.script-brand {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  padding: 2px 8px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 999px;
  font-size: 10.5px;
  color: var(--muted-foreground);
}

.script-brand-icon {
  width: 10px;
  height: 10px;
}

.script-body {
  padding: 16px 18px;
  animation: body-in 360ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both;
}

.script-body > * + * {
  margin-top: 14px;
}

.script-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
}

.script-heading::before {
  content: "";
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 2px;
  background: color-mix(in oklab, var(--foreground) 72%, transparent);
}

.script-markdown {
  min-width: 0;
  font-size: 13.5px;
  line-height: 1.6;
}

.script-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 9px 12px;
  border-top: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  animation: actions-in 420ms ease-out 160ms both;
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 11.5px;
  line-height: 1.4;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.action:hover:not(:disabled) {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.action:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--foreground) 45%, transparent);
  outline-offset: 1px;
}

.action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action.save {
  color: var(--foreground);
}

.saved-note {
  padding: 0 4px;
  font-size: 11.5px;
  color: var(--foreground);
}

.save-error {
  font-size: 11px;
  color: var(--destructive);
}

.action-icon {
  width: 13px;
  height: 13px;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes head-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@keyframes body-in {
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

@keyframes live-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .script-card,
  .script-head,
  .script-body,
  .script-actions {
    animation: none;
  }

  .script-live {
    animation: none;
  }
}
</style>
