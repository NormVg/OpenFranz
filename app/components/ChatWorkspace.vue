<script setup lang="ts">
import { useChatStore } from "~/stores/chat";

const props = defineProps<{
  user?: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
}>();

const emit = defineEmits<{
  (event: "sign-out"): void;
}>();

const route = useRoute();
const chatStore = useChatStore();
const theme = ref<"light" | "dark">("dark");
const sidebarOpen = ref(true);
const mobileSidebarOpen = ref(false);
const isMobile = ref(false);
const agentStatus = ref<"idle" | "busy" | "resuming">("idle");

let mobileQuery: MediaQueryList | null = null;

function syncMobile(event?: MediaQueryListEvent) {
  isMobile.value = event ? event.matches : (mobileQuery?.matches ?? false);
}

useHead({
  htmlAttrs: {
    "data-theme": theme,
  },
});

onMounted(async () => {
  mobileQuery = window.matchMedia("(max-width: 767px)");
  syncMobile();
  mobileQuery.addEventListener("change", syncMobile);

  try {
    await chatStore.hydrate();
  } catch {
    // The store exposes the user-facing error state.
  }

  const savedTheme = window.localStorage.getItem("openfranz:theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    theme.value = savedTheme;
  }

  const savedSidebar = window.localStorage.getItem("openfranz:sidebar");
  if (savedSidebar === "closed") {
    sidebarOpen.value = false;
  }
});

onBeforeUnmount(() => {
  mobileQuery?.removeEventListener("change", syncMobile);
  mobileQuery = null;
});

const activeView = computed<
  "chat" | "knowledge" | "brands" | "ingest" | "scripts" | "planner"
>(() => {
  if (route.query.view === "knowledge") return "knowledge";
  if (route.query.view === "brands") return "brands";
  if (route.query.view === "ingest") return "ingest";
  if (route.query.view === "scripts") return "scripts";
  if (route.query.view === "planner") return "planner";
  return "chat";
});

const activeTitle = computed(() => {
  if (!chatStore.activeChatId) return "New chat";
  return (
    chatStore.chats.find((chat) => chat.id === chatStore.activeChatId)?.title ??
    "New chat"
  );
});

const topbarTitle = computed(() => {
  if (activeView.value === "knowledge") return "Knowledge";
  if (activeView.value === "brands") return "Brands";
  if (activeView.value === "ingest") return "Ingest";
  if (activeView.value === "scripts") return "Scripts";
  if (activeView.value === "planner") return "Planner";
  return activeTitle.value;
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
  if (isMobile.value) {
    mobileSidebarOpen.value = true;
    return;
  }

  toggleSidebar();
}

async function startNewChat() {
  chatStore.newChat();
  mobileSidebarOpen.value = false;

  if (activeView.value !== "chat") {
    await navigateTo("/app");
  }
}

async function selectChat(id: string) {
  try {
    await chatStore.selectChat(id);
    mobileSidebarOpen.value = false;

    if (activeView.value !== "chat") {
      await navigateTo("/app");
    }
  } catch {
    chatStore.setError("Unable to open that chat. Please try again.");
  }
}

async function removeChat(id: string) {
  try {
    await chatStore.removeChat(id);
  } catch {
    chatStore.setError("Unable to delete that chat. Please try again.");
  }
}
</script>

<template>
  <div class="app-shell">
    <ChatSidebar
      class="desktop-sidebar"
      :chats="chatStore.chats"
      :active-chat-id="chatStore.activeChatId"
      :collapsed="!sidebarOpen"
      :show-toggle="false"
      :active-view="activeView"
      :user="props.user"
      @new-chat="startNewChat"
      @select="selectChat"
      @delete="removeChat"
      @sign-out="emit('sign-out')"
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
          :show-toggle="true"
          :active-view="activeView"
          :user="props.user"
          @new-chat="startNewChat"
          @select="selectChat"
          @delete="removeChat"
          @toggle="mobileSidebarOpen = false"
          @sign-out="emit('sign-out')"
        />
      </div>
    </div>

    <div class="main">
      <ChatTopbar
        :title="topbarTitle"
        :theme="theme"
        :agent-status="agentStatus"
        :sidebar-open="isMobile ? mobileSidebarOpen : sidebarOpen"
        @toggle-sidebar="onToggleSidebar"
        @toggle-theme="toggleTheme"
      />

      <KeepAlive>
        <LazyVfsExplorer v-if="activeView === 'knowledge'" />
        <LazyBrandsExplorer v-else-if="activeView === 'brands'" />
        <LazyIngestExplorer v-else-if="activeView === 'ingest'" />
        <LazyScriptsExplorer v-else-if="activeView === 'scripts'" />
        <LazyPlannerExplorer v-else-if="activeView === 'planner'" />
      </KeepAlive>

      <template v-if="activeView === 'chat'">
        <p v-if="chatStore.error" class="error" role="alert">{{ chatStore.error }}</p>

        <div v-if="chatStore.loading" class="loading">Loading chats...</div>
        <ChatSession
          v-else
          :key="chatStore.viewKey"
          :chat-id="chatStore.activeChatId"
          :initial-session="chatStore.initialSession"
          :initial-events="chatStore.initialEvents"
          :resume="Boolean(chatStore.initialSession)"
          :is-dark="theme === 'dark'"
          @status="agentStatus = $event"
        />
      </template>
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

.loading {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  font-size: 14px;
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

.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(0 0 0 / 0.5);
}

.mobile-sidebar {
  width: min(84vw, 320px);
  height: 100%;
  background: var(--background);
}

.mobile-sidebar :deep(.sidebar) {
  width: 100%;
}

@media (max-width: 767px) {
  .desktop-sidebar {
    display: none;
  }
}
</style>
