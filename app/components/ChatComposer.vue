<script setup lang="ts">
import { ArrowUpIcon, Loader2Icon, SquareIcon } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    disabled?: boolean;
    busy?: boolean;
    stopping?: boolean;
    placeholder?: string;
    autofocus?: boolean;
  }>(),
  {
    disabled: false,
    busy: false,
    stopping: false,
    placeholder: "Ask anything...",
    autofocus: false,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "submit"): void;
  (event: "stop"): void;
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
const canSend = computed(() => props.modelValue.trim().length > 0 && !props.disabled && !props.busy);

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (canSend.value) emit("submit");
  }
}

onMounted(() => {
  if (props.autofocus) {
    requestAnimationFrame(() => textarea.value?.focus({ preventScroll: true }));
  }
});
</script>

<template>
  <form class="composer" @submit.prevent="canSend && emit('submit')">
    <label class="sr-only" for="chat-composer">Message the agent</label>
    <textarea
      id="chat-composer"
      ref="textarea"
      class="composer-input"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder"
      rows="2"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div class="composer-footer">
      <span class="composer-hint">Enter to send · Shift + Enter for a new line</span>
      <div class="composer-actions">
        <button
          v-if="busy"
          class="icon-button stop"
          type="button"
          :disabled="stopping"
          aria-label="Stop response"
          @click="emit('stop')"
        >
          <Loader2Icon v-if="stopping" class="icon spin" />
          <SquareIcon v-else class="icon fill" />
        </button>
        <button
          v-else
          class="icon-button send"
          type="submit"
          :disabled="!canSend"
          aria-label="Send message"
        >
          <ArrowUpIcon class="icon" />
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.composer {
  min-width: 0;
  border: 1px solid color-mix(in oklab, var(--border) 80%, transparent);
  border-radius: 14px;
  background: color-mix(in oklab, var(--card) 95%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
  transition:
    border-color 150ms ease-out,
    box-shadow 150ms ease-out;
}

.composer:focus-within {
  border-color: var(--border);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--foreground) 5%, transparent);
}

.composer-input {
  display: block;
  width: 100%;
  min-height: 48px;
  max-height: 128px;
  padding: 12px 12px 4px;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font-size: 16px;
  line-height: 1.5;
  outline: none;
  resize: none;
}

.composer-input::placeholder {
  color: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
}

.composer-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.composer-footer {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 12px 8px;
}

.composer-hint {
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted-foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.icon-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  transition:
    background-color 150ms ease-out,
    opacity 150ms ease-out,
    transform 150ms ease-out;
}

.icon-button:active:not(:disabled) {
  transform: scale(0.94);
}

.icon-button.send {
  background: var(--foreground);
  color: var(--background);
}

.icon-button.send:hover:not(:disabled) {
  background: color-mix(in oklab, var(--foreground) 90%, transparent);
}

.icon-button.send:disabled {
  opacity: 0.3;
}

.icon-button.stop {
  background: color-mix(in oklab, var(--foreground) 15%, transparent);
  color: color-mix(in oklab, var(--foreground) 55%, transparent);
}

.icon-button.stop:hover:not(:disabled) {
  background: color-mix(in oklab, var(--foreground) 25%, transparent);
}

.icon {
  width: 14px;
  height: 14px;
}

.icon.fill {
  width: 10px;
  height: 10px;
  fill: currentColor;
}

.icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 640px) {
  .composer-input {
    padding-inline: 16px;
  }

  .composer-footer {
    padding-inline: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon.spin {
    animation: none;
  }
}
</style>
