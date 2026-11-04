<script setup lang="ts">
import { MenuIcon, MoonIcon, SunIcon } from "lucide-vue-next";
import { useChatStore } from "~/stores/chat";

const chatStore = useChatStore();
const theme = ref<"light" | "dark">("dark");
const sidebarOpen = ref(true);
const mobileSidebarOpen = ref(false);
const agentStatus = ref<"idle" | "busy" | "resuming">("idle");

useHead({
  htmlAttrs: {
    "data-theme": theme,
  },
});

onMounted(() => {
  chatStore.hydrate();

  const savedTheme = window.localStorage.getItem("openfranz:theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    theme.value = savedTheme;
  }

  const savedSidebar = window.localStorage.getItem("openfranz:sidebar");
  if (savedSidebar === "closed") {
    sidebarOpen.value = false;
  }
});

const activeTitle = computed(() => {
  if (!chatStore.activeChatId) return "New chat";
  return (
    chatStore.chats.find((chat) => chat.id === chatStore.activeChatId)?.title ??
    "New chat"
  );
});

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
  window.localStorage.setItem("openfranz:theme", theme.value);
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  window.localStorage.setItem(
    "openfranz:sidebar",
    sidebarOpen.value ? "open" : "closed",
  );
}

function onToggleSidebar() {
  if (window.matchMedia("(max-width: 767px)").matches) {
    mobileSidebarOpen.value = true;
    return;
  }

  toggleSidebar();
}

function startNewChat() {
  chatStore.newChat();
  mobileSidebarOpen.value = false;
}

function selectChat(id: string) {
  chatStore.selectChat(id);
  mobileSidebarOpen.value = false;
}

function removeChat(id: string) {
  chatStore.removeChat(id);
}
</script>

<template>
  <div class="app-shell">
    <ChatSidebar
      class="desktop-sidebar"
      :chats="chatStore.chats"
      :active-chat-id="chatStore.activeChatId"
      :collapsed="!sidebarOpen"
      :theme="theme"
      @new-chat="startNewChat"
      @select="selectChat"
      @delete="removeChat"
      @toggle="toggleSidebar"
      @toggle-theme="toggleTheme"
    />

    <div
      v-if="mobileSidebarOpen"
      class="mobile-overlay"
      @click="mobileSidebarOpen = false"
    >
      <div class="mobile-sidebar" @click.stop>
        <ChatSidebar
          :chats="chatStore.chats"
          :active-chat-id="chatStore.activeChatId"
          :collapsed="false"
          :theme="theme"
          @new-chat="startNewChat"
          @select="selectChat"
          @delete="removeChat"
          @toggle="mobileSidebarOpen = false"
          @toggle-theme="toggleTheme"
        />
      </div>
    </div>

    <div class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button
            class="icon-button"
            type="button"
            aria-label="Toggle sidebar"
            @click="onToggleSidebar"
          >
            <MenuIcon class="icon" />
          </button>
          <span class="title">{{ activeTitle }}</span>
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
            @click="toggleTheme"
          >
            <SunIcon v-if="theme === 'dark'" class="icon" />
            <MoonIcon v-else class="icon" />
          </button>
        </div>
      </header>

      <ChatSession
        :key="chatStore.viewKey"
        :chat-id="chatStore.activeChatId"
        :initial-session="chatStore.initialSession"
        :initial-events="chatStore.initialEvents"
        :resume="Boolean(chatStore.initialSession)"
        :is-dark="theme === 'dark'"
        @status="agentStatus = $event"
      />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100dvh;
  overflow: hidden;
  background: var(--background);
}

.desktop-sidebar {
  display: flex;
}

.main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

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

.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 0.5);
}

.mobile-sidebar {
  width: 84vw;
  max-width: 320px;
  height: 100%;
  background: var(--background);
}

@media (max-width: 767px) {
  .desktop-sidebar {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-dot[data-state="busy"] {
    animation: none;
  }
}
</style>
