<script setup lang="ts">
import { RefreshCwIcon } from "lucide-vue-next";
import type {
  VfsEntry,
  VfsGraph,
  VfsLinkInfo,
} from "~~/shared/types/vfs";
import { vfsService } from "~/services/vfs.service";

const graph = shallowRef<VfsGraph | null>(null);
const selectedFile = ref<VfsEntry | null>(null);
const content = ref("");
const links = ref<{
  outgoing: VfsLinkInfo[];
  backlinks: VfsLinkInfo[];
} | null>(null);
const loading = ref(false);
const previewLoading = ref(false);
const reindexing = ref(false);
const error = ref<string | null>(null);

const fileNodes = computed(
  () => graph.value?.nodes.filter((node) => node.type === "file") ?? [],
);

const nodeMap = computed(
  () => new Map(fileNodes.value.map((node) => [node.path, node])),
);

const edges = computed(() =>
  (graph.value?.edges ?? []).filter(
    (edge) =>
      nodeMap.value.has(edge.sourcePath) && nodeMap.value.has(edge.targetPath),
  ),
);

async function loadGraph() {
  loading.value = true;
  error.value = null;

  try {
    graph.value = await vfsService.graph();
    if (
      selectedFile.value &&
      !fileNodes.value.some((node) => node.path === selectedFile.value?.path)
    ) {
      closePreview();
    }
  } catch {
    error.value = "Unable to load the knowledge graph. Please try again.";
  } finally {
    loading.value = false;
  }
}

function closePreview() {
  selectedFile.value = null;
  content.value = "";
  links.value = null;
}

async function selectNode(path: string) {
  const node = nodeMap.value.get(path);
  if (!node) return;

  selectedFile.value = node;
  previewLoading.value = true;
  error.value = null;

  try {
    const [file, fileLinks] = await Promise.all([
      vfsService.readFile(node.path),
      vfsService.links(node.path),
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

async function reindex() {
  if (reindexing.value) return;
  reindexing.value = true;

  try {
    await vfsService.reindex();
    await loadGraph();
  } catch {
    error.value = "Unable to reindex links. Please try again.";
  } finally {
    reindexing.value = false;
  }
}

onMounted(loadGraph);
</script>

<template>
  <section class="graph-view">
    <header class="graph-header">
      <div>
        <h2>Knowledge graph</h2>
        <p>{{ fileNodes.length }} files · {{ edges.length }} links</p>
      </div>
      <button
        class="reindex-button"
        type="button"
        :disabled="reindexing"
        @click="reindex"
      >
        <RefreshCwIcon class="reindex-icon" :class="{ spin: reindexing }" />
        {{ reindexing ? "Indexing..." : "Reindex" }}
      </button>
    </header>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <p v-if="loading" class="empty">Loading graph...</p>
    <p v-else-if="fileNodes.length === 0" class="empty">
      No text files to graph yet. Create a file with [[wiki links]] or Markdown
      links first.
    </p>

    <div v-else class="graph-body">
      <VfsForceGraph
        :nodes="fileNodes"
        :edges="edges"
        :selected-path="selectedFile?.path ?? null"
        @select="selectNode"
        @clear="closePreview"
      />

      <aside v-if="selectedFile" class="graph-panel">
        <VfsFilePreview
          :file="selectedFile"
          :content="content"
          :links="links"
          :loading="previewLoading"
          @close="closePreview"
        />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.graph-view {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.graph-header {
  display: flex;
  min-height: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
}

.graph-header h2 {
  font-size: 13px;
  font-weight: 500;
}

.graph-header p {
  margin-top: 2px;
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 10px;
  color: var(--muted-foreground);
}

.reindex-button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--muted-foreground);
  font-size: 11px;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.reindex-button:hover:not(:disabled) {
  background: color-mix(in oklab, var(--muted) 70%, transparent);
  color: var(--foreground);
}

.reindex-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.reindex-icon {
  width: 13px;
  height: 13px;
}

.graph-body {
  display: flex;
  min-height: 0;
  flex: 1;
}

.graph-panel {
  display: flex;
  width: 380px;
  min-height: 0;
  flex-shrink: 0;
  flex-direction: column;
  border-left: 1px solid var(--border);
  background: var(--card);
}

.graph-panel :deep(.preview) {
  min-height: 0;
  flex: 1;
}

.empty {
  padding: 24px 20px;
  font-size: 13px;
  line-height: 1.6;
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

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .graph-panel {
    width: 320px;
  }
}

@media (max-width: 760px) {
  .graph-body {
    flex-direction: column;
  }

  .graph-panel {
    width: auto;
    height: 45%;
    border-top: 1px solid var(--border);
    border-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
