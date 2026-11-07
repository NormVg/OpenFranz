<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

useHead({
  title: "OpenFranz — Self-learning content agent",
  meta: [
    {
      name: "description",
      content: "A self-learning content agent that grows with modern content.",
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
    <section class="center" aria-labelledby="landing-title">
      <BrandMark class="mark" />

      <div class="copy">
        <h1 id="landing-title">OpenFranz</h1>
        <p>A self-learning content agent that grows with modern content.</p>
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
        {{ signingIn ? "Connecting..." : "Continue with Google" }}
      </button>

      <p v-if="signInError" class="error" role="alert">{{ signInError }}</p>
    </section>
  </main>
</template>

<style scoped>
.landing {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 24px;
  background: #0d0d0c;
  color: #f2efe8;
}

.center {
  display: flex;
  width: 100%;
  max-width: 520px;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.mark {
  width: clamp(64px, 8vw, 88px);
  height: auto;
  color: #f2efe8;
  animation: arrive 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
}

h1 {
  margin: 0;
  font-family:
    "Iowan Old Style",
    "Palatino Linotype",
    Palatino,
    ui-serif,
    serif;
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.035em;
  animation: arrive 600ms 80ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.copy p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #8f8b83;
  text-wrap: pretty;
  animation: arrive 600ms 150ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.action {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  margin-top: 28px;
  padding: 0 18px;
  border: 1px solid #f2efe8;
  border-radius: 4px;
  background: #f2efe8;
  color: #0d0d0c;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  animation: arrive 600ms 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transition:
    background-color 160ms ease-out,
    border-color 160ms ease-out,
    transform 160ms ease-out;
}

.action:hover:not(:disabled) {
  border-color: #d8d4ca;
  background: #d8d4ca;
}

.action:active:not(:disabled) {
  transform: scale(0.98);
}

.action:disabled {
  cursor: wait;
  opacity: 0.55;
}

.error {
  margin-top: 18px;
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 1.5;
  color: #e8b4b0;
}

@keyframes arrive {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mark,
  h1,
  .copy p,
  .action {
    animation: none;
  }

  .action {
    transition: none;
  }
}
</style>
