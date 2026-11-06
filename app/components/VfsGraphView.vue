<script setup lang="ts">
import { RefreshCwIcon } from "lucide-vue-next";
import type {
  VfsEntry,
  VfsGraph,
  VfsLinkInfo,
} from "~~/shared/types/vfs";
import { vfsService } from "~/services/vfs.service";

const graph = ref<VfsGraph | null>(null);
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

const positions = computed(() => {
  const nodes = fileNodes.value;
  const centerX = 450;
  const centerY = 280;
  const radius = nodes.length <= 1 ? 0 : Math.min(220, 90 + nodes.length * 10);
  const result = new Map<string, { x: number; y: number }>();

  nodes.forEach((node, index) => {
    const angle =
      nodes.length === 1
        ? 0
        : (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
    result.set(node.path, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });

  return result;
});

function shortLabel(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return name.length > 18 ? `${name.slice(0, 16)}...` : name;
}

async function loadGraph() {
  loading.value = true;
  error.value = null;

  try {
    graph.value = await vfsService.graph();
    if (
      selectedFile.value &&
      !fileNodes.value.some((node) => node.path === selectedFile.value?.path)
    ) {
      selectedFile.value = null;
      content.value = "";
      links.value = null;
    }
  } catch {
    error.value = "Unable to load the knowledge graph. Please try again.";
  } finally {
    loading.value = false;
  }
}

async function selectNode(node: VfsEntry) {
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

    <template v-else>
      <div class="graph-canvas">
        <svg
          viewBox="0 0 900 560"
          role="img"
          aria-label="Knowledge graph of files and references"
        >
          <defs>
            <marker
              id="vfs-arrow"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 Z" fill="currentColor" />
            </marker>
          </defs>

          <line
            v-for="(edge, index) in edges"
            :key="`${edge.sourcePath}-${edge.targetPath}-${index}`"
            class="edge"
            :x1="positions.get(edge.sourcePath)?.x ?? 0"
            :y1="positions.get(edge.sourcePath)?.y ?? 0"
            :x2="positions.get(edge.targetPath)?.x ?? 0"
            :y2="positions.get(edge.targetPath)?.y ?? 0"
            marker-end="url(#vfs-arrow)"
          />

          <g
            v-for="node in fileNodes"
            :key="node.path"
            class="node"
            :class="{ selected: selectedFile?.path === node.path }"
            role="button"
            tabindex="0"
            @click="selectNode(node)"
            @keydown.enter="selectNode(node)"
          >
            <circle
              :cx="positions.get(node.path)?.x ?? 0"
              :cy="positions.get(node.path)?.y ?? 0"
              :r="selectedFile?.path === node.path ? 8 : 6"
            />
            <text
              :x="positions.get(node.path)?.x ?? 0"
              :y="(positions.get(node.path)?.y ?? 0) + 20"
              text-anchor="middle"
            >
              {{ shortLabel(node.path) }}
            </text>
          </g>
        </svg>
      </div>

      <VfsFilePreview
        :file="selectedFile"
        :content="content"
        :links="links"
        :loading="previewLoading"
      />
    </template>
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

.graph-canvas {
  min-height: 240px;
  flex: 1;
  overflow: hidden;
  color: var(--muted-foreground);
}

.graph-canvas svg {
  display: block;
  width: 100%;
  height: 100%;
}

.edge {
  stroke: color-mix(in oklab, var(--muted-foreground) 35%, transparent);
  stroke-width: 1;
}

.node {
  cursor: pointer;
  outline: none;
}

.node circle {
  fill: var(--foreground);
  transition: fill 150ms ease-out;
}

.node.selected circle {
  fill: #fbf3db;
}

.node text {
  fill: var(--muted-foreground);
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 10px;
}

.node:hover text,
.node.selected text {
  fill: var(--foreground);
}

.node:focus-visible circle {
  stroke: var(--foreground);
  stroke-width: 2;
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

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
