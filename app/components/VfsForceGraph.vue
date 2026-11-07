<script setup lang="ts">
import {
  MaximizeIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-vue-next";
import type ForceGraph from "force-graph";
import type { LinkObject, NodeObject } from "force-graph";
import type { VfsEntry, VfsLinkInfo } from "~~/shared/types/vfs";

interface GraphNode extends NodeObject {
  id: string;
  label: string;
  folder: "arsenal" | "knowledge" | "other";
  degree: number;
}

interface GraphLink extends LinkObject<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphTheme {
  background: string;
  foreground: string;
  muted: string;
  link: string;
  font: string;
}

const props = defineProps<{
  nodes: VfsEntry[];
  edges: VfsLinkInfo[];
  selectedPath?: string | null;
}>();

const emit = defineEmits<{
  select: [path: string];
  clear: [];
}>();

const stage = ref<HTMLDivElement | null>(null);
const host = ref<HTMLDivElement | null>(null);
const hoveredId = ref<string | null>(null);

const nodeCache = new Map<string, GraphNode>();
const theme: GraphTheme = {
  background: "#111111",
  foreground: "#e5e5e5",
  muted: "#8a8a8a",
  link: "rgba(255,255,255,0.22)",
  font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
};

let graph: ForceGraph<GraphNode, GraphLink> | null = null;
let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;
let hasSettled = false;

const degreeMap = computed(() => {
  const map = new Map<string, number>();
  for (const edge of props.edges) {
    map.set(edge.sourcePath, (map.get(edge.sourcePath) ?? 0) + 1);
    map.set(edge.targetPath, (map.get(edge.targetPath) ?? 0) + 1);
  }
  return map;
});

const neighbors = computed(() => {
  const map = new Map<string, Set<string>>();
  for (const edge of props.edges) {
    if (!map.has(edge.sourcePath)) map.set(edge.sourcePath, new Set());
    if (!map.has(edge.targetPath)) map.set(edge.targetPath, new Set());
    map.get(edge.sourcePath)?.add(edge.targetPath);
    map.get(edge.targetPath)?.add(edge.sourcePath);
  }
  return map;
});

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

function parentName(path: string): string {
  return path.split("/").slice(-2, -1)[0] ?? "";
}

function truncateLabel(value: string): string {
  return value.length > 22 ? `${value.slice(0, 20)}...` : value;
}

function folderOf(path: string): GraphNode["folder"] {
  if (path.startsWith("/arsenal/")) return "arsenal";
  if (path.startsWith("/knowledge/")) return "knowledge";
  return "other";
}

function nodeRadius(node: GraphNode): number {
  return 4 + Math.min(node.degree, 8) * 0.7;
}

/**
 * Keeps labels from stacking on top of each other. A plain circular push is
 * enough for a library of this size and avoids pulling in a second force
 * library just for collision.
 */
function collisionForce(alpha: number) {
  const nodes = graph?.graphData().nodes;
  if (!nodes) return;

  const minDistance = 110;

  for (let index = 0; index < nodes.length; index += 1) {
    const left = nodes[index]!;
    for (let other = index + 1; other < nodes.length; other += 1) {
      const right = nodes[other]!;
      const dx = (right.x ?? 0) - (left.x ?? 0);
      const dy = (right.y ?? 0) - (left.y ?? 0);
      const distance = Math.hypot(dx, dy) || 0.01;
      if (distance >= minDistance) continue;

      const push = ((minDistance - distance) / distance) * alpha * 0.6;
      left.vx = (left.vx ?? 0) - dx * push;
      left.vy = (left.vy ?? 0) - dy * push;
      right.vx = (right.vx ?? 0) + dx * push;
      right.vy = (right.vy ?? 0) + dy * push;
    }
  }
}

function readTheme() {
  if (!stage.value) return;

  const styles = getComputedStyle(stage.value);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  theme.background = read("--background", "#111111");
  theme.foreground = read("--foreground", "#e5e5e5");
  theme.muted = read("--muted-foreground", "#8a8a8a");
  theme.font = read("--font-sans", "ui-sans-serif, system-ui, sans-serif");

  const isDark = document.documentElement.dataset.theme !== "light";
  theme.link = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
}

function syncData() {
  if (!graph) return;

  hasSettled = false;
  const degree = degreeMap.value;
  const nameCounts = new Map<string, number>();
  for (const entry of props.nodes) {
    const name = baseName(entry.path);
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }

  const labelFor = (path: string) => {
    const name = baseName(path);
    const parent = parentName(path);
    const ambiguous = (nameCounts.get(name) ?? 0) > 1 && parent.length > 0;
    return truncateLabel(ambiguous ? `${parent}/${name}` : name);
  };

  const nodes = props.nodes.map((entry) => {
    const existing = nodeCache.get(entry.path);
    if (existing) {
      existing.label = labelFor(entry.path);
      existing.degree = degree.get(entry.path) ?? 0;
      existing.folder = folderOf(entry.path);
      return existing;
    }

    const node: GraphNode = {
      id: entry.path,
      label: labelFor(entry.path),
      folder: folderOf(entry.path),
      degree: degree.get(entry.path) ?? 0,
    };
    nodeCache.set(entry.path, node);
    return node;
  });

  const alive = new Set(props.nodes.map((entry) => entry.path));
  for (const path of nodeCache.keys()) {
    if (!alive.has(path)) nodeCache.delete(path);
  }

  graph.graphData({
    nodes,
    links: props.edges.map((edge) => ({
      source: edge.sourcePath,
      target: edge.targetPath,
    })),
  });
}

function paintNode(
  node: GraphNode,
  ctx: CanvasRenderingContext2D,
  scale: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const selected = node.id === props.selectedPath;
  const hovered = node.id === hoveredId.value;
  const dimmed =
    hoveredId.value !== null &&
    hoveredId.value !== node.id &&
    !(neighbors.value.get(hoveredId.value)?.has(node.id) ?? false);

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.2 : 1;

  const radius = nodeRadius(node);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);

  if (node.folder === "knowledge") {
    ctx.fillStyle = theme.background;
    ctx.fill();
    ctx.lineWidth = 1.4 / scale;
    ctx.strokeStyle = theme.muted;
    ctx.stroke();
  } else {
    ctx.fillStyle = theme.foreground;
    ctx.fill();
  }

  if (selected || hovered) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 3 / scale, 0, Math.PI * 2);
    ctx.lineWidth = 1.5 / scale;
    ctx.strokeStyle = theme.foreground;
    ctx.stroke();
  }

  const fontSize = 9 / scale;
  ctx.font = `${fontSize}px ${theme.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3 / scale;
  ctx.strokeStyle = theme.background;
  ctx.strokeText(node.label, x, y + radius + 4 / scale);
  ctx.fillStyle = selected || hovered ? theme.foreground : theme.muted;
  ctx.fillText(node.label, x, y + radius + 4 / scale);

  ctx.restore();
}

function paintPointerArea(
  node: GraphNode,
  color: string,
  ctx: CanvasRenderingContext2D,
  scale: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const radius = nodeRadius(node) + 3 / scale;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  const fontSize = 9 / scale;
  ctx.font = `${fontSize}px ${theme.font}`;
  const width = ctx.measureText(node.label).width;
  ctx.fillRect(
    x - width / 2 - 2 / scale,
    y + radius + 3 / scale,
    width + 4 / scale,
    fontSize + 2 / scale,
  );
}

function resize() {
  if (!graph || !host.value) return;

  const { clientWidth, clientHeight } = host.value;
  if (clientWidth === 0 || clientHeight === 0) return;

  graph.width(clientWidth).height(clientHeight);
}

async function mountGraph() {
  const element = host.value;
  if (!element) return;

  readTheme();

  const { default: ForceGraphFactory } = await import("force-graph");
  if (!host.value) return;

  graph = new ForceGraphFactory<GraphNode, GraphLink>(element)
    .backgroundColor("transparent")
    .nodeId("id")
    .nodeRelSize(4)
    .nodeVal((node) => 1 + Math.min(node.degree, 8) * 0.4)
    .nodeCanvasObject(paintNode)
    .nodePointerAreaPaint(paintPointerArea)
    .linkColor(() => theme.link)
    .linkWidth(1.2)
    .linkDirectionalArrowLength(3)
    .linkDirectionalArrowRelPos(1)
    .linkDirectionalArrowColor(() => theme.muted)
    .onNodeClick((node) => {
      emit("select", node.id);
      graph?.centerAt(node.x, node.y, 450);
    })
    .onNodeHover((node) => {
      hoveredId.value = node?.id ?? null;
    })
    .onNodeDragEnd((node) => {
      node.fx = node.x;
      node.fy = node.y;
    })
    .onBackgroundClick(() => emit("clear"))
    .onEngineStop(() => {
      if (hasSettled) return;
      hasSettled = true;
      graph?.zoomToFit(450, 80);
    })
    .cooldownTicks(180)
    .warmupTicks(20)
    .d3AlphaDecay(0.03)
    .d3VelocityDecay(0.32)
    .minZoom(0.15)
    .maxZoom(8);

  graph.d3Force("charge")?.strength(-110);
  graph.d3Force("link")?.distance(70);
  graph.d3Force("collide", collisionForce);

  resize();
  syncData();
  graph.zoomToFit(0, 80);
}

function zoomIn() {
  graph?.zoom(graph.zoom() * 1.35, 250);
}

function zoomOut() {
  graph?.zoom(graph.zoom() / 1.35, 250);
}

function fit() {
  graph?.zoomToFit(450, 70);
}

function resetLayout() {
  for (const node of nodeCache.values()) {
    node.fx = undefined;
    node.fy = undefined;
  }

  graph?.d3ReheatSimulation();
  graph?.zoomToFit(450, 70);
}

watch(
  () => [props.nodes, props.edges],
  () => syncData(),
);

onMounted(async () => {
  await mountGraph();

  if (host.value) {
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(host.value);
  }

  themeObserver = new MutationObserver(() => readTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  themeObserver?.disconnect();
  themeObserver = null;
  graph?._destructor();
  graph = null;
});
</script>

<template>
  <div ref="stage" class="graph-stage">
    <div
      ref="host"
      class="graph-host"
      role="application"
      aria-label="Knowledge graph. Scroll to zoom, drag to pan, drag a node to pin it."
    />

    <div class="graph-legend" aria-hidden="true">
      <span class="legend-item">
        <span class="legend-dot solid" />
        Arsenal
      </span>
      <span class="legend-item">
        <span class="legend-dot hollow" />
        Knowledge
      </span>
    </div>

    <div class="graph-controls">
      <button type="button" aria-label="Zoom in" title="Zoom in" @click="zoomIn">
        <PlusIcon />
      </button>
      <button type="button" aria-label="Zoom out" title="Zoom out" @click="zoomOut">
        <MinusIcon />
      </button>
      <button type="button" aria-label="Fit graph" title="Fit graph" @click="fit">
        <MaximizeIcon />
      </button>
      <button
        type="button"
        aria-label="Reset layout"
        title="Reset layout"
        @click="resetLayout"
      >
        <RotateCcwIcon />
      </button>
    </div>

    <p class="graph-hint">Scroll to zoom · Drag to pan · Drag a node to pin it</p>
  </div>
</template>

<style scoped>
.graph-stage {
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  background: var(--background);
  contain: strict;
}

.graph-host {
  position: absolute;
  inset: 0;
}

.graph-host :deep(canvas) {
  display: block;
}

.graph-legend {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 12px;
  padding: 6px 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: color-mix(in oklab, var(--card) 82%, transparent);
  font-size: 10px;
  color: var(--muted-foreground);
  pointer-events: none;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.legend-dot.solid {
  background: var(--foreground);
}

.legend-dot.hollow {
  border: 1px solid var(--muted-foreground);
}

.graph-controls {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in oklab, var(--card) 88%, transparent);
}

.graph-controls button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.graph-controls button:hover {
  background: color-mix(in oklab, var(--muted) 55%, transparent);
  color: var(--foreground);
}

.graph-controls svg {
  width: 14px;
  height: 14px;
}

.graph-hint {
  position: absolute;
  left: 12px;
  bottom: 12px;
  font-family: var(--font-sans);
  font-size: 10px;
  color: var(--muted-foreground);
  pointer-events: none;
}

@media (max-width: 760px) {
  .graph-hint {
    display: none;
  }
}
</style>
