<script setup lang="ts">
import { PencilIcon, Trash2Icon } from "lucide-vue-next";
import type { BrandRecord } from "~~/shared/types/brand";

defineProps<{
  brand: BrandRecord;
}>();

const emit = defineEmits<{
  (event: "edit"): void;
  (event: "delete"): void;
}>();
</script>

<template>
  <article class="detail">
    <header class="detail-header">
      <div class="detail-copy">
        <h2>{{ brand.name }}</h2>
        <p class="slug">/{{ brand.slug }}</p>
      </div>
      <div class="actions">
        <button class="action" type="button" @click="emit('edit')">
          <PencilIcon class="action-icon" aria-hidden="true" />
          Edit
        </button>
        <button class="action danger" type="button" @click="emit('delete')">
          <Trash2Icon class="action-icon" aria-hidden="true" />
          Delete
        </button>
      </div>
    </header>

    <p v-if="brand.summary" class="summary">{{ brand.summary }}</p>

    <dl class="facts">
      <div v-if="brand.website" class="fact">
        <dt>Website</dt>
        <dd>
          <a :href="brand.website" target="_blank" rel="noreferrer">
            {{ brand.website }}
          </a>
        </dd>
      </div>
      <div v-if="brand.audience" class="fact">
        <dt>Audience</dt>
        <dd>{{ brand.audience }}</dd>
      </div>
      <div v-if="brand.tone" class="fact">
        <dt>Tone</dt>
        <dd>{{ brand.tone }}</dd>
      </div>
    </dl>

    <section v-if="brand.products.length" class="section">
      <h3>Products</h3>
      <div class="products">
        <article
          v-for="product in brand.products"
          :key="product.name"
          class="product"
        >
          <h4>{{ product.name }}</h4>
          <p v-if="product.description" class="product-copy">
            {{ product.description }}
          </p>
          <ul v-if="product.features.length" class="features">
            <li v-for="feature in product.features" :key="feature">
              {{ feature }}
            </li>
          </ul>
          <p v-if="product.pricing" class="pricing">{{ product.pricing }}</p>
        </article>
      </div>
    </section>

    <section v-if="brand.notes" class="section">
      <h3>Notes</h3>
      <p class="notes">{{ brand.notes }}</p>
    </section>
  </article>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.detail-copy h2 {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.slug {
  margin-top: 2px;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--muted-foreground);
}

.actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.action {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid color-mix(in oklab, var(--border) 70%, transparent);
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 12px;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.action:hover {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.action.danger:hover {
  border-color: color-mix(in oklab, var(--destructive) 40%, transparent);
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
}

.action-icon {
  width: 13px;
  height: 13px;
}

.summary {
  font-size: 14px;
  line-height: 1.6;
  color: var(--foreground);
}

.facts {
  display: grid;
  gap: 10px;
}

.fact {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 12px;
  font-size: 13px;
}

.fact dt {
  color: var(--muted-foreground);
}

.fact dd {
  min-width: 0;
  overflow-wrap: anywhere;
}

.fact a {
  color: var(--foreground);
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 3px;
}

.section h3 {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.products {
  display: grid;
  gap: 10px;
}

.product {
  padding: 12px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--muted) 22%, transparent);
}

.product h4 {
  font-size: 14px;
  font-weight: 600;
}

.product-copy {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted-foreground);
}

.features {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.features li {
  padding: 2px 7px;
  border: 1px solid color-mix(in oklab, var(--border) 60%, transparent);
  border-radius: 999px;
  font-size: 11px;
  color: var(--muted-foreground);
}

.pricing {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
}

.notes {
  font-size: 13px;
  line-height: 1.6;
  color: var(--muted-foreground);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .detail {
    padding: 16px;
  }

  .detail-header {
    flex-direction: column;
  }
}
</style>
