<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import type { BrandInput, BrandRecord } from "~~/shared/types/brand";
import { brandService } from "~/services/brand.service";

const brands = shallowRef<BrandRecord[]>([]);
const selectedId = ref<string | null>(null);
const mode = ref<"view" | "create" | "edit">("view");
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);

const selectedBrand = computed(
  () => brands.value.find((brand) => brand.id === selectedId.value) ?? null,
);

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return "Unable to load brands. Please try again.";
}

async function load() {
  loading.value = true;
  error.value = null;

  try {
    brands.value = await brandService.list();

    if (
      selectedId.value &&
      !brands.value.some((brand) => brand.id === selectedId.value)
    ) {
      selectedId.value = brands.value[0]?.id ?? null;
    }
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function select(id: string) {
  selectedId.value = id;
  mode.value = "view";
}

function startCreate() {
  mode.value = "create";
}

function startEdit() {
  if (selectedBrand.value) mode.value = "edit";
}

function cancel() {
  mode.value = "view";
}

async function save(input: BrandInput) {
  saving.value = true;
  error.value = null;

  try {
    const saved =
      mode.value === "edit" && selectedBrand.value
        ? await brandService.update(selectedBrand.value.id, input)
        : await brandService.create(input);

    await load();
    selectedId.value = saved.id;
    mode.value = "view";
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  const brand = selectedBrand.value;
  if (!brand) return;
  if (!window.confirm(`Delete ${brand.name}?`)) return;

  try {
    await brandService.remove(brand.id);
    selectedId.value = null;
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  }
}
</script>

<template>
  <section class="brands">
    <header class="brands-header">
      <div class="brands-copy">
        <h1>Brands</h1>
        <p>Product facts the agent can use in chat.</p>
      </div>
      <button class="primary" type="button" @click="startCreate">
        <PlusIcon class="icon" aria-hidden="true" />
        New brand
      </button>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="brands-body">
      <BrandList
        :brands="brands"
        :active-id="selectedId"
        :loading="loading"
        @select="select"
      />

      <div class="brands-pane">
        <BrandEditor
          v-if="mode === 'create'"
          :saving="saving"
          @save="save"
          @cancel="cancel"
        />
        <BrandEditor
          v-else-if="mode === 'edit' && selectedBrand"
          :brand="selectedBrand"
          :saving="saving"
          @save="save"
          @cancel="cancel"
        />
        <BrandDetail
          v-else-if="selectedBrand"
          :brand="selectedBrand"
          @edit="startEdit"
          @delete="remove"
        />
        <div v-else class="empty">
          <p>Select a brand or create one.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.brands {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.brands-header {
  display: flex;
  min-height: 64px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.brands-copy {
  min-width: 0;
}

.brands-copy h1 {
  font-size: 14px;
  font-weight: 500;
}

.brands-copy p {
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  color: var(--muted-foreground);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary {
  display: inline-flex;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: var(--foreground);
  color: var(--background);
  font-size: 12px;
  font-weight: 500;
  transition: opacity 150ms ease-out;
}

.primary:hover {
  opacity: 0.9;
}

.icon {
  width: 13px;
  height: 13px;
}

.brands-body {
  display: flex;
  min-height: 0;
  flex: 1;
}

.brands-pane {
  min-width: 0;
  flex: 1;
  overflow-y: auto;
}

.empty {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-size: 13px;
  color: var(--muted-foreground);
  text-align: center;
}

.error {
  margin: 12px 16px 0;
  padding: 8px 12px;
  border: 1px solid color-mix(in oklab, var(--destructive) 35%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  font-size: 13px;
  line-height: 1.5;
  color: var(--destructive);
}

@media (max-width: 767px) {
  .brands-header {
    min-height: 56px;
  }

  .brands-copy p {
    display: none;
  }

  .brands-body {
    flex-direction: column;
  }
}
</style>
