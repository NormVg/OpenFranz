<script setup lang="ts">
import { RefreshCwIcon, SearchIcon } from "lucide-vue-next";
import type { VfsEntry, VfsLinkInfo } from "~~/shared/types/vfs";
import { vfsService } from "~/services/vfs.service";

const currentPath = ref("/");
const entries = ref<VfsEntry[]>([]);
const selectedFile = ref<VfsEntry | null>(null);
const content = ref("");
const links = ref<{
  outgoing: VfsLinkInfo[];
  backlinks: VfsLinkInfo[];
} | null>(null);
const loading = ref(false);
const previewLoading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref("");
const searchResults = ref<VfsEntry[]>([]);
const searching = ref(false);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

const visibleEntries = computed(() =>
  searchQuery.value.trim() ? searchResults.value : entries.value,
);

async function load(path: string) {
  loading.value = true;
  error.value = null;

  try {
    currentPath.value = path;
    entries.value = await vfsService.list(path);
    selectedFile.value = null;
    content.value = "";
    links.value = null;
    searchQuery.value = "";
    searchResults.value = [];
  } catch {
    error.value = "Unable to load files. Please try again.";
  } finally {
    loading.value = false;
  }
}

async function open(entry: VfsEntry) {
  if (entry.type === "directory") {
    await load(entry.path);
    return;
  }

  selectedFile.value = entry;
  previewLoading.value = true;
  error.value = null;

  try {
    const [file, fileLinks] = await Promise.all([
      vfsService.readFile(entry.path),
      vfsService.links(entry.path),
    ]);
    content.value = file.content;
    links.value = fileLinks;
  } catch {
    error.value = "Unable to read that file. Please try again.";
    content.value = "";
    links.value = null;
  } finally {
    previewLoading.value = false;
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);

  const query = searchQuery.value.trim();
  if (!query) {
    searchResults.value = [];
    searching.value = false;
    return;
  }

  searching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      searchResults.value = await vfsService.find(query);
    } catch {
      error.value = "Unable to search files. Please try again.";
    } finally {
      searching.value = false;
    }
  }, 200);
}

onMounted(() => load("/"));

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <section class="file-browser">
    <header class="toolbar">
      <VfsBreadcrumbs :path="currentPath" @navigate="load" />

      <div class="toolbar-actions">
        <label class="search">
          <SearchIcon class="search-icon" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Fuzzy find files..."
            aria-label="Fuzzy find files"
            @input="onSearchInput"
          />
        </label>
        <button
          class="refresh-button"
          type="button"
          aria-label="Refresh files"
          title="Refresh files"
          @click="load(currentPath)"
        >
          <RefreshCwIcon class="refresh-icon" />
        </button>
      </div>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="body">
      <aside class="list-panel">
        <p v-if="searching" class="searching">Searching...</p>
        <VfsFileList
          :entries="visibleEntries"
          :active-path="selectedFile?.path"
          :loading="loading"
          @open="open"
        />
      </aside>

      <VfsFilePreview
        :file="selectedFile"
        :content="content"
        :links="links"
        :loading="previewLoading"
      />
    </div>
  </section>
</template>

<style scoped>
.file-browser {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.toolbar {
  display: flex;
  min-height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
}

.toolbar-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
}

.search {
  display: flex;
  height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: color-mix(in oklab, var(--card) 80%, transparent);
}

.search-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: var(--muted-foreground);
}

.search input {
  width: 150px;
  border: 0;
  background: transparent;
  color: var(--foreground);
  font-size: 12px;
  outline: none;
}

.search input::placeholder {
  color: var(--muted-foreground);
}

.refresh-button {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.refresh-button:hover {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.refresh-icon {
  width: 14px;
  height: 14px;
}

.body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
}

.list-panel {
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.searching {
  padding: 8px 12px 0;
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 10px;
  color: var(--muted-foreground);
}

.error {
  margin: 12px;
  padding: 8px 12px;
  border: 1px solid color-mix(in oklab, var(--destructive) 35%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  font-size: 13px;
  line-height: 1.5;
  color: var(--destructive);
}

@media (max-width: 760px) {
  .toolbar {
    flex-wrap: wrap;
    padding-block: 8px;
  }

  .search input {
    width: 120px;
  }

  .body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(180px, 40%) minmax(0, 1fr);
  }

  .list-panel {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}
</style>
