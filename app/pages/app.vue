<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

definePageMeta({
  middleware: "auth",
});

const { data: session } = await authClient.useSession(useFetch);

async function signOut() {
  await authClient.signOut();
  await navigateTo("/");
}
</script>

<template>
  <ChatWorkspace :user="session?.user ?? null" @sign-out="signOut" />
</template>
