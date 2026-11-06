<script setup lang="ts">
import {
  ArrowUpIcon,
  ImagePlusIcon,
  Loader2Icon,
  SquareIcon,
  XIcon,
} from "lucide-vue-next";
import {
  MAX_CHAT_ATTACHMENTS,
  validateChatAttachment,
} from "~~/shared/utils/chat-attachments";

interface ChatAttachment {
  id: string;
  file: File;
  previewUrl: string;
}

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
  (event: "submit", files: File[]): void;
  (event: "stop"): void;
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const attachments = ref<ChatAttachment[]>([]);
const attachmentError = ref<string | null>(null);
const isDragging = ref(false);

const canSend = computed(
  () =>
    (props.modelValue.trim().length > 0 || attachments.value.length > 0) &&
    !props.disabled &&
    !props.busy,
);

function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
}

function addFiles(files: FileList | File[]) {
  attachmentError.value = null;

  for (const file of Array.from(files)) {
    const error = validateChatAttachment(file, attachments.value.length);
    if (error) {
      attachmentError.value = error;
      continue;
    }

    attachments.value.push({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }
}

function removeAttachment(id: string) {
  const index = attachments.value.findIndex((attachment) => attachment.id === id);
  if (index === -1) return;

  URL.revokeObjectURL(attachments.value[index]!.previewUrl);
  attachments.value.splice(index, 1);
}

function clearAttachments() {
  for (const attachment of attachments.value) {
    URL.revokeObjectURL(attachment.previewUrl);
  }
  attachments.value = [];
}

function submit() {
  if (!canSend.value) return;

  const files = attachments.value.map((attachment) => attachment.file);
  emit("submit", files);
  clearAttachments();
  attachmentError.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submit();
  }
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) addFiles(input.files);
  input.value = "";
}

function onPaste(event: ClipboardEvent) {
  const files = event.clipboardData?.files;
  if (!files?.length) return;

  event.preventDefault();
  addFiles(files);
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function onDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement | null;
  const next = event.relatedTarget as Node | null;

  if (!current || !next || !current.contains(next)) {
    isDragging.value = false;
  }
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files?.length) addFiles(files);
}

onMounted(() => {
  if (props.autofocus) {
    requestAnimationFrame(() => textarea.value?.focus({ preventScroll: true }));
  }
});

onBeforeUnmount(clearAttachments);
</script>

<template>
  <form
    class="composer"
    :class="{ dragging: isDragging }"
    @submit.prevent="submit"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div v-if="attachments.length" class="attachments" aria-label="Attached images">
      <figure
        v-for="attachment in attachments"
        :key="attachment.id"
        class="attachment"
      >
        <img :src="attachment.previewUrl" :alt="attachment.file.name" />
        <button
          class="remove-attachment"
          type="button"
          aria-label="Remove image"
          @click="removeAttachment(attachment.id)"
        >
          <XIcon class="remove-icon" />
        </button>
      </figure>
    </div>

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
      @paste="onPaste"
    />

    <p v-if="attachmentError" class="attachment-error" role="alert">
      {{ attachmentError }}
    </p>

    <div class="composer-footer">
      <div class="composer-left">
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept="image/*"
          multiple
          @change="onFileInput"
        />
        <button
          class="icon-button attach"
          type="button"
          :disabled="disabled || busy || attachments.length >= MAX_CHAT_ATTACHMENTS"
          aria-label="Attach images"
          title="Attach images"
          @click="fileInput?.click()"
        >
          <ImagePlusIcon class="icon" />
        </button>
      </div>

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

    <div v-if="isDragging" class="drop-overlay" aria-hidden="true">
      Drop images here
    </div>
  </form>
</template>

<style scoped>
.composer {
  position: relative;
  min-width: 0;
  border: 1px solid color-mix(in oklab, var(--border) 80%, transparent);
  border-radius: 14px;
  background: color-mix(in oklab, var(--card) 95%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
  transition:
    border-color 150ms ease-out,
    box-shadow 150ms ease-out;
}

.composer:focus-within,
.composer.dragging {
  border-color: var(--border);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--foreground) 5%, transparent);
}

.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px 0;
}

.attachment {
  position: relative;
  width: 64px;
  height: 64px;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--muted);
}

.attachment img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-attachment {
  position: absolute;
  top: 3px;
  right: 3px;
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.62);
  color: #fff;
}

.remove-icon {
  width: 11px;
  height: 11px;
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

.attachment-error {
  padding: 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--destructive);
}

.composer-footer {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 12px 8px;
}

.composer-left,
.composer-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
}

.icon-button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  transition:
    background-color 150ms ease-out,
    opacity 150ms ease-out,
    transform 150ms ease-out;
}

.icon-button:active:not(:disabled) {
  transform: scale(0.94);
}

.icon-button.attach {
  background: color-mix(in oklab, var(--muted) 35%, transparent);
  color: var(--muted-foreground);
}

.icon-button.attach:hover:not(:disabled) {
  background: color-mix(in oklab, var(--muted) 65%, transparent);
  color: var(--foreground);
}

.icon-button.attach:disabled {
  opacity: 0.3;
}

.icon-button.attach .icon {
  width: 15px;
  height: 15px;
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

.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: color-mix(in oklab, var(--background) 82%, transparent);
  color: var(--foreground);
  font-size: 13px;
  pointer-events: none;
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

  .attachments {
    padding-inline: 16px;
  }

  .attachment-error {
    padding-inline: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon.spin {
    animation: none;
  }
}
</style>
