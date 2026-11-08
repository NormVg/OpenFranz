<script setup lang="ts">
import {
  ArrowUpIcon,
  BrainIcon,
  ChevronLeftIcon,
  ImagePlusIcon,
  Loader2Icon,
  MicIcon,
  SearchIcon,
  SquareIcon,
  TagIcon,
  XIcon,
} from "lucide-vue-next";
import type { BrandProduct, BrandRecord } from "~~/shared/types/brand";
import type { BrandContext } from "~~/shared/utils/brand-context";
import {
  MAX_CHAT_ATTACHMENTS,
  validateChatAttachment,
} from "~~/shared/utils/chat-attachments";
import { brandService } from "~/services/brand.service";
import { transcribeService } from "~/services/transcribe.service";
import { appendTranscript } from "~~/shared/utils/chat";

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
  (
    event: "submit",
    files: File[],
    brand: BrandContext | null,
    deep: boolean,
  ): void;
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
const selectedProduct = ref<BrandProduct | null>(null);
const pendingBrand = ref<BrandRecord | null>(null);
const deepMode = ref(false);
const isRecording = ref(false);
const isTranscribing = ref(false);
const recordingSeconds = ref(0);
const voiceError = ref<string | null>(null);

const MAX_RECORDING_SECONDS = 120;

let mediaRecorder: MediaRecorder | null = null;
let mediaStream: MediaStream | null = null;
let recordingTimer: ReturnType<typeof setInterval> | null = null;
let audioChunks: Blob[] = [];

const filteredBrands = computed(() => {
  const query = brandQuery.value.trim().toLowerCase();
  if (!query) return brands.value;

  return brands.value.filter((brand) =>
    [brand.name, brand.summary].join(" ").toLowerCase().includes(query),
  );
});

const brandLabel = computed(() => {
  if (!selectedBrand.value) return "";
  return selectedProduct.value
    ? `${selectedBrand.value.name} · ${selectedProduct.value.name}`
    : selectedBrand.value.name;
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

  if (!brandMenuOpen.value) {
    pendingBrand.value = null;
    brandQuery.value = "";
    return;
  }

  if (brands.value.length > 0) return;

  brandLoading.value = true;

  try {
    brands.value = await brandService.list();
  } catch {
    brands.value = [];
  } finally {
    brandLoading.value = false;
  }
}

function chooseBrand(brand: BrandRecord) {
  pendingBrand.value = brand;
  brandQuery.value = "";
}

function chooseProduct(product: BrandProduct | null) {
  if (!pendingBrand.value) return;

  selectedBrand.value = pendingBrand.value;
  selectedProduct.value = product;
  pendingBrand.value = null;
  brandMenuOpen.value = false;
  brandQuery.value = "";
}

function backToBrands() {
  pendingBrand.value = null;
  brandQuery.value = "";
}

function clearBrand() {
  selectedBrand.value = null;
  selectedProduct.value = null;
  brandMenuOpen.value = false;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = Array.from({ length: channels }, (_, index) =>
    buffer.getChannelData(index),
  );
  let offset = 44;

  for (let index = 0; index < length; index += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel]![index]!));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }

  return arrayBuffer;
}

function clearRecordingTimer() {
  if (!recordingTimer) return;
  clearInterval(recordingTimer);
  recordingTimer = null;
}

function stopStream() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

async function transcribeRecording(chunks: Blob[], mimeType: string) {
  isTranscribing.value = true;
  voiceError.value = null;

  try {
    const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
    const encoded = await blob.arrayBuffer();
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(encoded);
    const wav = encodeWav(decoded);
    const duration = decoded.duration;
    await context.close();

    const text = (await transcribeService.transcribe(wav, duration)).trim();
    if (!text) {
      voiceError.value = "I could not hear anything. Try again.";
      return;
    }

    const next = appendTranscript(props.modelValue, text);
    emit("update:modelValue", next);
    await nextTick();
    textarea.value?.focus();
    textarea.value?.setSelectionRange(next.length, next.length);
  } catch {
    voiceError.value = "Unable to transcribe that recording. Please try again.";
  } finally {
    isTranscribing.value = false;
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return;
  mediaRecorder.stop();
  clearRecordingTimer();
  stopStream();
}

async function startRecording() {
  if (isRecording.value || isTranscribing.value) return;

  voiceError.value = null;

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    voiceError.value = "Voice input is not supported in this browser.";
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    const mimeType = mediaRecorder.mimeType;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const chunks = audioChunks;
      audioChunks = [];
      mediaRecorder = null;
      isRecording.value = false;
      recordingSeconds.value = 0;
      void transcribeRecording(chunks, mimeType);
    };

    mediaRecorder.start();
    isRecording.value = true;
    recordingSeconds.value = 0;
    recordingTimer = setInterval(() => {
      recordingSeconds.value += 1;
      if (recordingSeconds.value >= MAX_RECORDING_SECONDS) {
        stopRecording();
      }
    }, 1000);
  } catch {
    stopStream();
    isRecording.value = false;
    voiceError.value =
      "Microphone access was blocked. Allow it in the browser and try again.";
  }
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording();
    return;
  }

  void startRecording();
}

function formatRecordingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function submit() {
  if (!canSend.value) return;

  const files = attachments.value.map((attachment) => attachment.file);
  emit(
    "submit",
    files,
    selectedBrand.value
      ? {
          slug: selectedBrand.value.slug,
          name: selectedBrand.value.name,
          product: selectedProduct.value?.name ?? null,
        }
      : null,
    deepMode.value,
  );
  clearAttachments();
  selectedBrand.value = null;
  selectedProduct.value = null;
  deepMode.value = false;
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

onBeforeUnmount(() => {
  clearAttachments();
  clearRecordingTimer();
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
  }
  mediaRecorder = null;
  stopStream();
});
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

    <p v-if="voiceError" class="attachment-error" role="alert">
      {{ voiceError }}
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
          class="icon-button attach brand-toggle"
          :class="{ selected: Boolean(selectedBrand) }"
          type="button"
          :disabled="disabled || busy"
          :aria-expanded="brandMenuOpen"
          :aria-label="selectedBrand ? `Change brand, ${brandLabel}` : 'Attach a brand'"
          :title="selectedBrand ? `Brand: ${brandLabel}` : 'Attach a brand'"
          @click="toggleBrandMenu"
        >
          <TagIcon class="icon" />
          <span class="brand-toggle-label" aria-hidden="true">
            {{ brandLabel }}
          </span>
        </button>
        <button
          class="icon-button attach deep-toggle"
          :class="{ active: deepMode }"
          type="button"
          :disabled="disabled || busy"
          :aria-pressed="deepMode"
          :aria-label="deepMode ? 'Turn off deep mode' : 'Deep mode'"
          :title="
            deepMode
              ? 'Deep mode is on: the agent asks questions before writing'
              : 'Deep mode: ask questions before writing'
          "
          @click="deepMode = !deepMode"
        >
          <BrainIcon class="icon" />
          <span class="deep-toggle-label" aria-hidden="true">Deep</span>
        </button>
      </div>

      <div class="composer-actions">
        <button
          class="icon-button attach voice-toggle"
          :class="{ recording: isRecording, transcribing: isTranscribing }"
          type="button"
          :disabled="disabled || busy || isTranscribing"
          :aria-pressed="isRecording"
          :aria-label="
            isRecording ? 'Stop recording' : 'Record a voice message'
          "
          :title="
            isRecording
              ? 'Stop recording and transcribe'
              : 'Record a voice message'
          "
          @click="toggleRecording"
        >
          <Loader2Icon v-if="isTranscribing" class="icon spin" />
          <SquareIcon v-else-if="isRecording" class="icon fill" />
          <MicIcon v-else class="icon" />
          <span v-if="isRecording" class="voice-timer">
            {{ formatRecordingTime(recordingSeconds) }}
          </span>
        </button>
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
      :aria-label="pendingBrand ? 'Products' : 'Brands'"
    >
      <template v-if="!pendingBrand">
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

        <button
          v-if="selectedBrand"
          class="brand-remove"
          type="button"
          aria-label="Remove brand"
          @click="clearBrand"
        >
          <XIcon class="brand-remove-icon" aria-hidden="true" />
          <span class="brand-remove-label">
            Remove {{ selectedBrand.name }}
          </span>
        </button>

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
          @click="chooseBrand(brand)"
        >
          <span class="brand-option-name">{{ brand.name }}</span>
          <span class="brand-option-meta">
            {{ brand.products.length }}
            {{ brand.products.length === 1 ? "product" : "products" }}
          </span>
        </button>
      </template>

      <template v-else>
        <div class="brand-step-header">
          <button
            class="brand-back"
            type="button"
            aria-label="Back to brands"
            @click="backToBrands"
          >
            <ChevronLeftIcon class="brand-back-icon" aria-hidden="true" />
          </button>
          <span class="brand-step-title">{{ pendingBrand.name }}</span>
        </div>

        <button
          class="brand-option"
          type="button"
          role="option"
          :aria-selected="selectedProduct === null"
          @click="chooseProduct(null)"
        >
          <span class="brand-option-name">Whole brand</span>
          <span class="brand-option-meta">Use the brand-level facts</span>
        </button>

        <p v-if="pendingBrand.products.length === 0" class="brand-state">
          No products yet.
        </p>
        <button
          v-for="product in pendingBrand.products"
          :key="product.name"
          class="brand-option"
          type="button"
          role="option"
          :aria-selected="selectedProduct?.name === product.name"
          @click="chooseProduct(product)"
        >
          <span class="brand-option-name">{{ product.name }}</span>
          <span class="brand-option-meta">
            {{ product.description || product.pricing || "Product" }}
          </span>
        </button>
      </template>
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

.brand-remove {
  display: flex;
  width: calc(100% - 16px);
  align-items: center;
  gap: 8px;
  margin: 0 8px 6px;
  padding: 7px 9px;
  border: 1px solid color-mix(in oklab, var(--destructive) 30%, transparent);
  border-radius: 7px;
  background: transparent;
  color: var(--destructive);
  font-size: 12px;
  text-align: left;
  transition: background-color 150ms ease-out;
}

.brand-remove:hover {
  background: color-mix(in oklab, var(--destructive) 10%, transparent);
}

.brand-remove:focus-visible {
  outline: 2px solid color-mix(in oklab, var(--destructive) 45%, transparent);
  outline-offset: 1px;
}

.brand-remove-icon {
  width: 13px;
  height: 13px;
}

.brand-remove-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.brand-step-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 2px 6px;
}

.brand-back {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted-foreground);
}

.brand-back:hover {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.brand-back-icon {
  width: 13px;
  height: 13px;
}

.brand-step-title {
  overflow: hidden;
  font-size: 11px;
  font-weight: 500;
  color: var(--foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
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

.icon-button.attach.active {
  background: var(--foreground);
  color: var(--background);
}

.icon-button.attach.active:hover:not(:disabled) {
  background: color-mix(in oklab, var(--foreground) 88%, transparent);
  color: var(--background);
}

.icon-button.attach:disabled {
  opacity: 0.3;
}

.icon-button.attach .icon {
  width: 15px;
  height: 15px;
}

.brand-toggle {
  width: auto;
  min-width: 28px;
  max-width: 28px;
  padding: 0;
  gap: 0;
  overflow: hidden;
  transition:
    max-width 200ms ease-out,
    padding 200ms ease-out,
    gap 200ms ease-out,
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.brand-toggle.selected {
  max-width: 172px;
  padding: 0 10px;
  gap: 5px;
  background: var(--foreground);
  color: var(--background);
}

.brand-toggle.selected:hover:not(:disabled) {
  background: color-mix(in oklab, var(--foreground) 88%, transparent);
  color: var(--background);
}

.brand-toggle-label {
  display: inline-block;
  max-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  opacity: 0;
  transition:
    max-width 200ms ease-out,
    opacity 150ms ease-out 60ms;
}

.brand-toggle.selected .brand-toggle-label {
  max-width: 124px;
  opacity: 1;
}

.deep-toggle {
  width: auto;
  min-width: 28px;
  max-width: 28px;
  padding: 0;
  gap: 0;
  overflow: hidden;
  transition:
    max-width 180ms ease-out,
    padding 180ms ease-out,
    gap 180ms ease-out,
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.deep-toggle.active {
  max-width: 80px;
  padding: 0 9px;
  gap: 5px;
}

.deep-toggle-label {
  display: inline-block;
  max-width: 0;
  overflow: hidden;
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  transition:
    max-width 180ms ease-out,
    opacity 150ms ease-out;
}

.deep-toggle.active .deep-toggle-label {
  max-width: 40px;
  opacity: 1;
}

.voice-toggle {
  width: auto;
  min-width: 28px;
  max-width: 28px;
  padding: 0;
  gap: 0;
  overflow: hidden;
  transition:
    max-width 180ms ease-out,
    padding 180ms ease-out,
    gap 180ms ease-out,
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.voice-toggle.recording {
  max-width: 84px;
  padding: 0 9px;
  gap: 5px;
  background: color-mix(in oklab, var(--destructive) 16%, transparent);
  color: var(--destructive);
}

.voice-toggle.recording .icon {
  animation: voice-pulse 1.2s ease-in-out infinite;
}

.voice-timer {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

@keyframes voice-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.45;
  }
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
  gap: 7px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out,
    color 150ms ease-out,
    transform 150ms ease-out;
}

.stop-button:hover:not(:disabled) {
  border-color: color-mix(in oklab, var(--foreground) 22%, transparent);
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.stop-button:active:not(:disabled) {
  transform: scale(0.97);
}

.stop-button:disabled {
  cursor: progress;
  opacity: 0.55;
}

.stop-button .icon {
  width: 9px;
  height: 9px;
}

.stop-button .icon.fill {
  fill: currentColor;
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

  .voice-toggle.recording .icon {
    animation: none;
  }
}
</style>
