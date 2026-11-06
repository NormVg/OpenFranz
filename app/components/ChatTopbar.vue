<script setup lang="ts">
import { MenuIcon, MoonIcon, SunIcon } from "lucide-vue-next";

defineProps<{
  title: string;
  theme: "light" | "dark";
  agentStatus: "idle" | "busy" | "resuming";
}>();

const emit = defineEmits<{
  (event: "toggle-sidebar"): void;
  (event: "toggle-theme"): void;
}>();
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <button
        class="icon-button"
        type="button"
        aria-label="Toggle sidebar"
        @click="emit('toggle-sidebar')"
      >
        <MenuIcon class="icon" />
      </button>
      <span class="title">{{ title }}</span>
    </div>

    <div class="topbar-right">
      <span v-if="agentStatus !== 'idle'" class="status">
        <span class="status-dot" :data-state="agentStatus" aria-hidden="true"></span>
        {{ agentStatus === "busy" ? "Working" : "Resuming" }}
      </span>
      <button
        class="icon-button"
        type="button"
        :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="emit('toggle-theme')"
      >
        <SunIcon v-if="theme === 'dark'" class="icon" />
        <MoonIcon v-else class="icon" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  height: 56px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
}

.topbar-left,
.topbar-right {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-button {
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: color-mix(in oklab, var(--muted-foreground) 72%, transparent);
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.icon-button:hover {
  background: color-mix(in oklab, var(--muted) 60%, transparent);
  color: var(--foreground);
}

.icon {
  width: 16px;
  height: 16px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 9999px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: var(--muted-foreground);
}

.status-dot[data-state="busy"] {
  background: var(--foreground);
  animation: breathe 1.6s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot[data-state="busy"] {
    animation: none;
  }
}
</style>
