<script setup lang="ts">
import { PlusIcon } from "lucide-vue-next";
import type { ScriptRecord, ScriptWithVersions } from "~~/shared/types/script";
import { scriptService } from "~/services/script.service";

const route = useRoute();

const scripts = shallowRef<ScriptRecord[]>([]);
const selected = ref<ScriptWithVersions | null>(null);
const mode = ref<"view" | "create" | "edit">("view");
const loading = ref(true);
const saving = ref(false);
const restoring = ref(false);
const error = ref<string | null>(null);

function errorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message.length > 0) return cause.message;
  return "Unable to load scripts. Please try again.";
}

async function load() {
  loading.value = true;
  error.value = null;

  try {
    scripts.value = await scriptService.list();

    if (selected.value) {
      const stillThere = scripts.value.some(
        (script) => script.id === selected.value?.id,
      );
      if (!stillThere) {
        selected.value = null;
        mode.value = "view";
      }
    }
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    loading.value = false;
  }
}

async function select(id: string) {
  error.value = null;

  try {
    selected.value = await scriptService.get(id);
    mode.value = "view";
  } catch (cause) {
    error.value = errorMessage(cause);
  }
}

function startCreate() {
  mode.value = "create";
}

function startEdit() {
  if (selected.value) mode.value = "edit";
}

function cancel() {
  mode.value = "view";
}

async function save(input: {
  title: string;
  brand: string;
  content: string;
  note: string;
}) {
  saving.value = true;
  error.value = null;

  try {
    const saved =
      mode.value === "edit" && selected.value
        ? await scriptService.saveVersion(selected.value.id, input)
        : await scriptService.create(input);

    selected.value = saved;
    mode.value = "view";
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    saving.value = false;
  }
}

async function restore(versionNumber: number) {
  if (!selected.value || restoring.value) return;

  restoring.value = true;
  error.value = null;

  try {
    selected.value = await scriptService.restore(
      selected.value.id,
      versionNumber,
    );
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    restoring.value = false;
  }
}

async function remove() {
  const script = selected.value;
  if (!script) return;
  if (!window.confirm(`Delete ${script.title}?`)) return;

  error.value = null;

  try {
    await scriptService.remove(script.id);
    selected.value = null;
    mode.value = "view";
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  }
}

onMounted(async () => {
  await load();

  const deepLink = route.query.script;
  if (typeof deepLink === "string" && deepLink.length > 0) {
    await select(deepLink);
  }
});
</script>

<template>
  <section class="scripts">
    <header class="scripts-header">
      <div class="scripts-copy">
        <h1>Scripts</h1>
        <p>Finished scripts with full version history, from you and the agent.</p>
      </div>
      <button class="primary" type="button" @click="startCreate">
        <PlusIcon class="icon" aria-hidden="true" />
        New script
      </button>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="scripts-body">
      <ScriptList
        :scripts="scripts"
        :active-id="selected?.id ?? null"
        :loading="loading"
        @select="select"
      />

      <div class="scripts-pane">
        <ScriptEditor
          v-if="mode === 'create'"
          :saving="saving"
          @save="save"
          @cancel="cancel"
        />
        <ScriptEditor
          v-else-if="mode === 'edit' && selected"
          :script="selected"
          :saving="saving"
          @save="save"
          @cancel="cancel"
        />
        <ScriptDetail
          v-else-if="selected"
          :key="selected.id + ':' + selected.versions.length"
          :script="selected"
          :restoring="restoring"
          @edit="startEdit"
          @delete="remove"
          @restore="restore"
        />
        <div v-else class="empty">
          <p>Select a script or create one.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.scripts {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.scripts-header {
  display: flex;
  min-height: 64px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.scripts-copy {
  min-width: 0;
}

.scripts-copy h1 {
  font-size: 14px;
  font-weight: 500;
}

.scripts-copy p {
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

.scripts-body {
  display: flex;
  min-height: 0;
  flex: 1;
}

.scripts-pane {
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
  .scripts-header {
    min-height: 56px;
  }

  .scripts-copy p {
    display: none;
  }

  .scripts-body {
    flex-direction: column;
  }
}
</style>
