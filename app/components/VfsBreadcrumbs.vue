<script setup lang="ts">
const props = defineProps<{
  path: string;
}>();

const emit = defineEmits<{
  (event: "navigate", path: string): void;
}>();

const segments = computed(() => {
  const parts = props.path.split("/").filter(Boolean);
  const items = [{ label: "/", path: "/" }];
  let current = "";

  for (const part of parts) {
    current += `/${part}`;
    items.push({ label: part, path: current });
  }

  return items;
});
</script>

<template>
  <nav class="breadcrumbs" aria-label="Filesystem path">
    <template v-for="(segment, index) in segments" :key="segment.path">
      <span v-if="index > 0" class="separator" aria-hidden="true">/</span>
      <button
        class="crumb"
        type="button"
        :aria-current="index === segments.length - 1 ? 'page' : undefined"
        @click="emit('navigate', segment.path)"
      >
        {{ segment.label }}
      </button>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.breadcrumbs::-webkit-scrollbar {
  display: none;
}

.crumb {
  flex-shrink: 0;
  padding: 4px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-foreground);
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 11px;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.crumb:hover,
.crumb[aria-current="page"] {
  background: color-mix(in oklab, var(--muted) 45%, transparent);
  color: var(--foreground);
}

.separator {
  color: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 11px;
}
</style>
