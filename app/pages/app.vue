<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

const { data: session } = await authClient.useSession(useFetch);

if (!session.value) {
  await navigateTo("/");
}

async function signOut() {
  await authClient.signOut();
  await navigateTo("/");
}
</script>

<template>
  <ChatWorkspace :user="session?.user ?? null" @sign-out="signOut" />
</template>
