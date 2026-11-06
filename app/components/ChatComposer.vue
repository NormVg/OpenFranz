<script setup lang="ts">
import {
  ArrowUpIcon,
  ImagePlusIcon,
  Loader2Icon,
  SearchIcon,
  SquareIcon,
  TagIcon,
  XIcon,
} from "lucide-vue-next";
import type { BrandRecord } from "~~/shared/types/brand";
import type { BrandContext } from "~~/shared/utils/brand-context";
import {
  MAX_CHAT_ATTACHMENTS,
  validateChatAttachment,
} from "~~/shared/utils/chat-attachments";
import { brandService } from "~/services/brand.service";

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
    submitting?: boolean;
    stopping?: boolean;
    placeholder?: string;
    autofocus?: boolean;
  }>(),
  {
    disabled: false,
    busy: false,
    submitting: false,
    stopping: false,
    placeholder: "Ask anything...",
    autofocus: false,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "submit", files: File[], brand: BrandContext | null): void;
  (event: "stop"): void;
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const attachments = ref<ChatAttachment[]>([]);
const attachmentError = ref<string | null>(null);
const isDragging = ref(false);
const brands = shallowRef<BrandRecord[]>([]);
const brandMenuOpen = ref(false);
const brandQuery = ref("");
const brandLoading = ref(false);
const selectedBrand = ref<BrandRecord | null>(null);

const filteredBrands = computed(() => {
  const query = brandQuery.value.trim().toLowerCase();
  if (!query) return brands.value;

  return brands.value.filter((brand) =>
    [brand.name, brand.summary].join(" ").toLowerCase().includes(query),
  );
});

const canSend = computed(
  () =>
    (props.modelValue.trim().length > 0 || attachments.value.length > 0) &&
    !props.disabled &&
    !props.busy &&
    !props.submitting,
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

async function toggleBrandMenu() {
  brandMenuOpen.value = !brandMenuOpen.value;
  if (!brandMenuOpen.value || brands.value.length > 0) return;

  brandLoading.value = true;

  try {
    brands.value = await brandService.list();
  } catch {
    brands.value = [];
  } finally {
    brandLoading.value = false;
  }
}

function selectBrand(brand: BrandRecord) {
  selectedBrand.value = brand;
  brandMenuOpen.value = false;
  brandQuery.value = "";
}

function clearBrand() {
  selectedBrand.value = null;
}

function submit() {
  if (!canSend.value) return;

  const files = attachments.value.map((attachment) => attachment.file);
  emit(
    "submit",
    files,
    selectedBrand.value
      ? { slug: selectedBrand.value.slug, name: selectedBrand.value.name }
      : null,
  );
  clearAttachments();
  selectedBrand.value = null;
  attachmentError.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && brandMenuOpen.value) {
    brandMenuOpen.value = false;
    return;
  }

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

    <div v-if="selectedBrand" class="brand-chip">
      <TagIcon class="brand-chip-icon" aria-hidden="true" />
      <span class="brand-chip-name">{{ selectedBrand.name }}</span>
      <button
        class="brand-chip-remove"
        type="button"
        aria-label="Remove brand"
        @click="clearBrand"
      >
        <XIcon class="brand-chip-x" aria-hidden="true" />
      </button>
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
        <button
          class="icon-button attach"
          type="button"
          :disabled="disabled || busy"
          aria-label="Attach a brand"
          title="Attach a brand"
          :aria-expanded="brandMenuOpen"
          @click="toggleBrandMenu"
        >
          <TagIcon class="icon" />
        </button>
      </div>

      <div class="composer-actions">
        <button
          v-if="busy"
          class="stop-button"
          type="button"
          :disabled="stopping"
          aria-label="Stop response"
          @click="emit('stop')"
        >
          <Loader2Icon v-if="stopping" class="icon spin" />
          <SquareIcon v-else class="icon fill" />
          <span>{{ stopping ? "Stopping" : "Stop" }}</span>
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

    <div
      v-if="brandMenuOpen"
      class="brand-backdrop"
      @click="brandMenuOpen = false"
    />
    <div
      v-if="brandMenuOpen"
      class="brand-menu"
      role="listbox"
      aria-label="Brands"
    >
      <div class="brand-search">
        <SearchIcon class="brand-search-icon" aria-hidden="true" />
        <input
          v-model="brandQuery"
          class="brand-search-input"
          type="search"
          placeholder="Search brands"
          aria-label="Search brands"
        />
      </div>

      <p v-if="brandLoading" class="brand-state">Loading...</p>
      <p v-else-if="filteredBrands.length === 0" class="brand-state">
        No brands yet.
      </p>
      <button
        v-for="brand in filteredBrands"
        :key="brand.id"
        class="brand-option"
        type="button"
        role="option"
        :aria-selected="selectedBrand?.id === brand.id"
        @click="selectBrand(brand)"
      >
        <span class="brand-option-name">{{ brand.name }}</span>
        <span class="brand-option-meta">
          {{ brand.products.length }}
          {{ brand.products.length === 1 ? "product" : "products" }}
        </span>
      </button>
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

.brand-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 10px 12px 0;
  padding: 3px 6px 3px 8px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 999px;
  background: color-mix(in oklab, var(--muted) 35%, transparent);
  font-size: 11px;
  color: var(--muted-foreground);
}

.brand-chip-icon {
  width: 11px;
  height: 11px;
}

.brand-chip-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-chip-remove {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
}

.brand-chip-remove:hover {
  background: color-mix(in oklab, var(--foreground) 10%, transparent);
  color: var(--foreground);
}

.brand-chip-x {
  width: 10px;
  height: 10px;
}

.brand-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
}

.brand-menu {
  position: absolute;
  bottom: 46px;
  left: 10px;
  z-index: 20;
  display: flex;
  width: 250px;
  max-height: 300px;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.28);
}

.brand-search {
  position: relative;
  padding: 2px 2px 6px;
}

.brand-search-icon {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 12px;
  height: 12px;
  color: var(--muted-foreground);
  transform: translateY(-50%);
  pointer-events: none;
}

.brand-search-input {
  width: 100%;
  height: 28px;
  padding: 0 8px 0 26px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 6px;
  background: color-mix(in oklab, var(--muted) 25%, transparent);
  color: var(--foreground);
  font-size: 12px;
  outline: none;
}

.brand-state {
  padding: 6px 8px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.brand-option {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  text-align: left;
}

.brand-option:hover,
.brand-option[aria-selected="true"] {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.brand-option-name {
  font-size: 12px;
  font-weight: 500;
}

.brand-option-meta {
  font-size: 10.5px;
  color: var(--muted-foreground);
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

.stop-button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid color-mix(in oklab, var(--destructive) 40%, transparent);
  border-radius: 999px;
  background: color-mix(in oklab, var(--destructive) 14%, transparent);
  color: var(--destructive);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out,
    transform 150ms ease-out;
}

.stop-button:hover:not(:disabled) {
  border-color: color-mix(in oklab, var(--destructive) 60%, transparent);
  background: color-mix(in oklab, var(--destructive) 22%, transparent);
}

.stop-button:active:not(:disabled) {
  transform: scale(0.96);
}

.stop-button:disabled {
  cursor: progress;
  opacity: 0.6;
}

.stop-button .icon {
  width: 11px;
  height: 11px;
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
