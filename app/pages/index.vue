<script setup lang="ts">
import { LogInIcon } from "lucide-vue-next";
import { authClient } from "~/lib/auth-client";

useHead({
  title: "OpenFranz",
  meta: [
    {
      name: "description",
      content: "A focused workspace for building with OpenFranz.",
    },
  ],
});

const { data: session } = await authClient.useSession(useFetch);
const signingIn = ref(false);
const signInError = ref<string | null>(null);

async function signInWithGoogle() {
  if (signingIn.value) return;
  signingIn.value = true;
  signInError.value = null;

  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app",
    });
  } catch {
    signInError.value = "Unable to start Google sign-in. Please try again.";
  } finally {
    signingIn.value = false;
  }
}
</script>

<template>
  <main class="landing">
    <section class="landing-card">
      <BrandMark class="mark" />
      <div class="copy">
        <p class="eyebrow">OpenFranz</p>
        <h1>Build with a focused agent.</h1>
        <p class="lede">
          A quiet workspace for thinking, building, and shipping with OpenFranz.
        </p>
      </div>

      <NuxtLink v-if="session" class="action" to="/app">
        Open chat
      </NuxtLink>
      <button
        v-else
        class="action"
        type="button"
        :disabled="signingIn"
        @click="signInWithGoogle"
      >
        <LogInIcon class="action-icon" />
        {{ signingIn ? "Connecting..." : "Continue with Google" }}
      </button>

      <p v-if="signInError" class="error" role="alert">{{ signInError }}</p>
      <p class="note">Sign in with Google to keep your chats private and synced.</p>
    </section>
  </main>
</template>

<style scoped>
.landing {
  display: flex;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--foreground) 8%, transparent), transparent 42%),
    var(--background);
}

.landing-card {
  display: flex;
  width: 100%;
  max-width: 440px;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px 28px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: color-mix(in oklab, var(--card) 92%, transparent);
  text-align: center;
}

.mark {
  width: 64px;
  height: 43px;
  color: var(--foreground);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

h1 {
  font-size: clamp(28px, 6vw, 38px);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--muted-foreground);
  text-wrap: pretty;
}

.action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--foreground);
  color: var(--background);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition:
    opacity 150ms ease-out,
    transform 150ms ease-out;
}

.action:hover:not(:disabled) {
  opacity: 0.9;
}

.action:active:not(:disabled) {
  transform: scale(0.985);
}

.action:disabled {
  cursor: wait;
  opacity: 0.65;
}

.action-icon {
  width: 16px;
  height: 16px;
}

.note {
  max-width: 300px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted-foreground);
}

.error {
  font-size: 13px;
  line-height: 1.5;
  color: var(--destructive);
}

@media (max-width: 480px) {
  .landing-card {
    padding: 32px 20px;
  }
}
</style>
