<script setup lang="ts">
import { PlusIcon, Trash2Icon } from "lucide-vue-next";
import type {
  BrandInput,
  BrandProduct,
  BrandRecord,
} from "~~/shared/types/brand";

const props = defineProps<{
  brand?: BrandRecord;
  saving: boolean;
}>();

const emit = defineEmits<{
  (event: "save", input: BrandInput): void;
  (event: "cancel"): void;
}>();

type ProductDraft = {
  name: string;
  description: string;
  features: string;
  pricing: string;
};

const name = ref(props.brand?.name ?? "");
const summary = ref(props.brand?.summary ?? "");
const website = ref(props.brand?.website ?? "");
const audience = ref(props.brand?.audience ?? "");
const tone = ref(props.brand?.tone ?? "");
const notes = ref(props.brand?.notes ?? "");
const products = ref<ProductDraft[]>(
  (props.brand?.products ?? []).map((product) => ({
    name: product.name,
    description: product.description,
    features: product.features.join(", "),
    pricing: product.pricing,
  })),
);

const canSave = computed(() => name.value.trim().length > 0 && !props.saving);

function addProduct() {
  products.value.push({
    name: "",
    description: "",
    features: "",
    pricing: "",
  });
}

function removeProduct(index: number) {
  products.value.splice(index, 1);
}

function submit() {
  if (!canSave.value) return;

  const parsedProducts: BrandProduct[] = products.value
    .map((product) => ({
      name: product.name.trim(),
      description: product.description.trim(),
      features: product.features
        .split(",")
        .map((feature) => feature.trim())
        .filter(Boolean),
      pricing: product.pricing.trim(),
    }))
    .filter((product) => product.name.length > 0);

  emit("save", {
    name: name.value.trim(),
    summary: summary.value.trim(),
    website: website.value.trim(),
    audience: audience.value.trim(),
    tone: tone.value.trim(),
    notes: notes.value,
    products: parsedProducts,
  });
}
</script>

<template>
  <form class="editor" @submit.prevent="submit">
    <header class="editor-header">
      <h2>{{ brand ? "Edit brand" : "New brand" }}</h2>
      <div class="actions">
        <button
          class="ghost"
          type="button"
          :disabled="saving"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button class="primary" type="submit" :disabled="!canSave">
          {{ saving ? "Saving..." : "Save" }}
        </button>
      </div>
    </header>

    <label class="field">
      <span>Name</span>
      <input
        v-model="name"
        type="text"
        required
        maxlength="120"
        placeholder="Acme Coffee"
      />
    </label>

    <label class="field">
      <span>Summary</span>
      <textarea
        v-model="summary"
        rows="2"
        maxlength="2000"
        placeholder="What the brand is and who it serves."
      />
    </label>

    <div class="grid">
      <label class="field">
        <span>Website</span>
        <input
          v-model="website"
          type="url"
          maxlength="500"
          placeholder="https://example.com"
        />
      </label>
      <label class="field">
        <span>Audience</span>
        <input
          v-model="audience"
          type="text"
          maxlength="500"
          placeholder="Home coffee drinkers"
        />
      </label>
      <label class="field">
        <span>Tone</span>
        <input
          v-model="tone"
          type="text"
          maxlength="500"
          placeholder="Warm, direct, no hype"
        />
      </label>
    </div>

    <section class="products">
      <div class="products-header">
        <h3>Products</h3>
        <button class="ghost" type="button" @click="addProduct">
          <PlusIcon class="icon" aria-hidden="true" />
          Add product
        </button>
      </div>

      <p v-if="products.length === 0" class="empty">No products yet.</p>

      <div v-for="(product, index) in products" :key="index" class="product">
        <div class="product-top">
          <label class="field">
            <span>Product name</span>
            <input v-model="product.name" type="text" maxlength="120" />
          </label>
          <button
            class="remove"
            type="button"
            aria-label="Remove product"
            @click="removeProduct(index)"
          >
            <Trash2Icon class="icon" aria-hidden="true" />
          </button>
        </div>

        <label class="field">
          <span>Description</span>
          <textarea v-model="product.description" rows="2" maxlength="2000" />
        </label>

        <div class="grid">
          <label class="field">
            <span>Features (comma separated)</span>
            <input
              v-model="product.features"
              type="text"
              placeholder="Fast, Small, Recyclable"
            />
          </label>
          <label class="field">
            <span>Pricing</span>
            <input
              v-model="product.pricing"
              type="text"
              maxlength="500"
              placeholder="$99"
            />
          </label>
        </div>
      </div>
    </section>

    <label class="field">
      <span>Notes</span>
      <textarea
        v-model="notes"
        rows="4"
        maxlength="20000"
        placeholder="Product-specific facts the agent should know."
      />
    </label>
  </form>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.editor-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 6px;
}

.primary,
.ghost {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  transition:
    background-color 150ms ease-out,
    opacity 150ms ease-out;
}

.primary {
  border: 0;
  background: var(--foreground);
  color: var(--background);
}

.primary:disabled {
  opacity: 0.4;
}

.ghost {
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  background: transparent;
  color: var(--muted-foreground);
}

.ghost:hover:not(:disabled) {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.field > span {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--muted-foreground);
}

.field input,
.field textarea {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 7px;
  background: color-mix(in oklab, var(--muted) 18%, transparent);
  color: var(--foreground);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  outline: none;
  resize: vertical;
}

.field input:focus,
.field textarea:focus {
  border-color: var(--border);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.products {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid color-mix(in oklab, var(--border) 50%, transparent);
}

.products-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.products-header h3 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.empty {
  font-size: 12px;
  color: var(--muted-foreground);
}

.product {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--muted) 18%, transparent);
}

.product-top {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.product-top .field {
  flex: 1;
}

.remove {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted-foreground);
}

.remove:hover {
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
}

.icon {
  width: 13px;
  height: 13px;
}

@media (max-width: 640px) {
  .editor {
    padding: 16px;
  }
}
</style>
