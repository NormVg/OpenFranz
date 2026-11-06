<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

useHead({
  title: "OpenFranz",
  meta: [
    {
      name: "description",
      content: "A focused workspace for thinking through ideas and shipping the next version.",
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
    <header class="masthead">
      <NuxtLink class="brand" to="/" aria-label="OpenFranz home">
        <BrandMark class="mark" />
        <span class="wordmark">OpenFranz</span>
      </NuxtLink>
      <p class="masthead-meta">Private workspace</p>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="kicker">A quieter place to build</p>
        <h1 id="hero-title">
          Make room<br />
          <em>for the work.</em>
        </h1>
        <p class="lede">
          OpenFranz is a focused chat workspace for thinking through ideas and
          shipping the next version.
        </p>

        <div class="actions">
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
          <p class="action-note">One account. Your chats stay yours.</p>
        </div>

        <p v-if="signInError" class="error" role="alert">{{ signInError }}</p>
      </div>

      <aside class="aside" aria-label="Workspace notes">
        <span class="aside-mark" aria-hidden="true"></span>
        <p class="aside-copy">
          One conversation at a time.<br />
          Stored privately.<br />
          Ready when you are.
        </p>
        <span class="aside-rule" aria-hidden="true"></span>
        <p class="aside-meta">OpenFranz / 2026</p>
      </aside>
    </section>

    <footer class="footer">
      <span>Built for focused work</span>
      <span class="footer-dot" aria-hidden="true"></span>
      <span>Google sign-in only</span>
    </footer>
  </main>
</template>

<style scoped>
.landing {
  --landing-bg: #0d0d0c;
  --landing-ink: #f2efe8;
  --landing-muted: #8f8b83;
  --landing-line: rgb(242 239 232 / 14%);
  --landing-accent: #fbf3db;

  display: grid;
  min-height: 100dvh;
  grid-template-rows: auto 1fr auto;
  padding: 0 clamp(24px, 5vw, 72px);
  background: var(--landing-bg);
  color: var(--landing-ink);
  font-family:
    "SF Pro Display",
    "Helvetica Neue",
    "Switzer",
    sans-serif;
}

.masthead {
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid var(--landing-line);
  animation: rise 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.mark {
  width: 28px;
  height: 19px;
  color: var(--landing-ink);
}

.wordmark {
  font-size: 14px;
  letter-spacing: 0.02em;
}

.masthead-meta,
.kicker,
.action-note,
.aside-meta,
.footer {
  font-family:
    "SF Mono",
    "JetBrains Mono",
    monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.masthead-meta {
  color: var(--landing-muted);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px);
  gap: clamp(32px, 8vw, 120px);
  align-items: end;
  padding: clamp(64px, 12vh, 140px) 0 clamp(56px, 10vh, 120px);
}

.hero-copy {
  max-width: 760px;
}

.kicker {
  margin-bottom: 24px;
  color: var(--landing-muted);
  animation: rise 600ms 80ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

h1 {
  margin: 0;
  font-family:
    "Iowan Old Style",
    "Palatino Linotype",
    Palatino,
    ui-serif,
    serif;
  font-size: clamp(56px, 9vw, 112px);
  font-weight: 400;
  line-height: 0.94;
  letter-spacing: -0.045em;
  text-wrap: balance;
  animation: rise 700ms 140ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

h1 em {
  color: var(--landing-muted);
  font-style: italic;
}

.lede {
  max-width: 480px;
  margin-top: 32px;
  font-size: clamp(15px, 1.4vw, 18px);
  line-height: 1.65;
  color: var(--landing-muted);
  text-wrap: pretty;
  animation: rise 600ms 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
  animation: rise 600ms 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid var(--landing-ink);
  border-radius: 4px;
  background: var(--landing-ink);
  color: var(--landing-bg);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
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

.action-note {
  color: var(--landing-muted);
  letter-spacing: 0.04em;
  text-transform: none;
}

.aside {
  display: flex;
  align-self: stretch;
  flex-direction: column;
  justify-content: flex-end;
  gap: 18px;
  padding: 0 0 8px 24px;
  border-left: 1px solid var(--landing-line);
  animation: rise 700ms 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.aside-mark {
  width: 8px;
  height: 8px;
  background: var(--landing-accent);
}

.aside-copy {
  font-size: 13px;
  line-height: 1.7;
  color: var(--landing-muted);
}

.aside-rule {
  width: 100%;
  height: 1px;
  background: var(--landing-line);
}

.aside-meta {
  color: var(--landing-muted);
  letter-spacing: 0.12em;
}

.footer {
  display: flex;
  min-height: 72px;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--landing-line);
  color: var(--landing-muted);
  letter-spacing: 0.08em;
  animation: rise 600ms 460ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.footer-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--landing-muted);
}

.error {
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.5;
  color: #e8b4b0;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 760px) {
  .masthead {
    min-height: 72px;
  }

  .hero {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 64px 0 56px;
  }

  .aside {
    max-width: 320px;
    padding: 20px 0 0;
    border-top: 1px solid var(--landing-line);
    border-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .masthead,
  .kicker,
  h1,
  .lede,
  .actions,
  .aside,
  .footer {
    animation: none;
  }

  .action {
    transition: none;
  }
}
</style>
