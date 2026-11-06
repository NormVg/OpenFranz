<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

definePageMeta({
  middleware: "auth",
});

async function signOut() {
  await authClient.signOut();
  await navigateTo("/");
}
</script>

<template>
  <ChatWorkspace @sign-out="signOut" />
</template>
