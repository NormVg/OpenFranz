<script setup lang="ts">
import {
  LogOutIcon,
  PanelLeftCloseIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-vue-next";
import type { ChatRecord } from "~~/shared/types/chat";

const props = withDefaults(
  defineProps<{
    chats: ChatRecord[];
    activeChatId: string | null;
    collapsed: boolean;
    showToggle?: boolean;
    user?: {
      name: string;
      email: string;
      image?: string | null;
    } | null;
  }>(),
  {
    showToggle: true,
    user: null,
  },
);

const emit = defineEmits<{
  (event: "new-chat"): void;
  (event: "select", id: string): void;
  (event: "delete", id: string): void;
  (event: "toggle"): void;
  (event: "sign-out"): void;
}>();

const initials = computed(() => {
  const source = props.user?.name?.trim() || props.user?.email || "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
});
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <button class="brand" type="button" @click="emit('new-chat')">
        <BrandMark class="mark" />
        <span class="brand-name">OpenFranz</span>
      </button>
      <button
        v-if="showToggle"
        class="icon-button"
        type="button"
        aria-label="Close sidebar"
        @click="emit('toggle')"
      >
        <PanelLeftCloseIcon class="icon" />
      </button>
    </div>

    <button
      class="new-session"
      :class="{ active: activeChatId === null }"
      type="button"
      @click="emit('new-chat')"
    >
      <PlusIcon class="icon" />
      New session
    </button>

    <div class="history">
      <p v-if="chats.length === 0" class="history-empty">No sessions yet</p>
      <div
        v-for="chat in chats"
        :key="chat.id"
        class="history-row"
        :class="{ active: chat.id === activeChatId }"
      >
        <button
          class="history-link"
          type="button"
          @click="emit('select', chat.id)"
        >
          <span class="history-title">{{ chat.title }}</span>
        </button>
        <button
          class="delete-button"
          type="button"
          aria-label="Delete session"
          @click.stop="emit('delete', chat.id)"
        >
          <Trash2Icon class="icon" />
        </button>
      </div>
    </div>

    <div v-if="user" class="sidebar-footer">
      <div class="account">
        <img
          v-if="user.image"
          class="avatar"
          :src="user.image"
          alt=""
          referrerpolicy="no-referrer"
        />
        <span v-else class="avatar avatar-fallback">{{ initials }}</span>
        <div class="account-copy">
          <span class="account-name">{{ user.name }}</span>
          <span class="account-email">{{ user.email }}</span>
        </div>
        <button
          class="logout-button"
          type="button"
          aria-label="Sign out"
          title="Sign out"
          @click="emit('sign-out')"
        >
          <LogOutIcon class="icon" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  width: 256px;
  flex-shrink: 0;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid var(--border);
  background: var(--background);
  transition:
    width 200ms ease-out,
    opacity 150ms ease-out;
}

.sidebar.collapsed {
  width: 0;
  overflow: hidden;
  border-right: 0;
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  display: flex;
  height: 56px;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px;
}

.brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--foreground);
  text-align: left;
  transition: background-color 150ms ease-out;
}

.brand:hover {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
}

.mark {
  display: block;
  width: 22px;
  height: 15px;
  flex-shrink: 0;
  color: var(--foreground);
}

.brand-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: color-mix(in oklab, var(--muted-foreground) 55%, transparent);
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.icon-button:hover {
  background: color-mix(in oklab, var(--muted) 60%, transparent);
  color: var(--muted-foreground);
}

.icon {
  width: 16px;
  height: 16px;
}

.new-session {
  display: flex;
  height: 32px;
  align-items: center;
  gap: 8px;
  margin: 4px 8px 8px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted-foreground);
  font-size: 14px;
  text-align: left;
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.new-session:hover,
.new-session.active {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.history {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.history-empty {
  padding: 8px;
  font-size: 12px;
  color: var(--muted-foreground);
}

.history-row {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  border-radius: 6px;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease-out,
    color 150ms ease-out;
}

.history-row:hover,
.history-row.active {
  background: color-mix(in oklab, var(--muted) 50%, transparent);
  color: var(--foreground);
}

.history-link {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 32px;
  align-items: center;
  padding: 0 32px 0 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 14px;
  text-align: left;
}

.history-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-button {
  position: absolute;
  top: 50%;
  right: 4px;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--muted-foreground);
  opacity: 0;
  transform: translateY(-50%);
  transition:
    background-color 150ms ease-out,
    opacity 150ms ease-out;
}

.history-row:hover .delete-button,
.delete-button:focus-visible {
  opacity: 1;
}

.delete-button:hover {
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 8px 12px;
  border-top: 1px solid var(--border);
}

.account {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-radius: 6px;
}

.avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--muted) 70%, transparent);
  color: var(--foreground);
  font-size: 11px;
  font-weight: 600;
}

.account-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.account-name,
.account-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--foreground);
}

.account-email {
  font-size: 11px;
  color: var(--muted-foreground);
}

.logout-button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
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

.logout-button:hover {
  background: color-mix(in oklab, var(--destructive) 12%, transparent);
  color: var(--destructive);
}

</style>
