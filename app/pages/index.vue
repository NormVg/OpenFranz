<script setup lang="ts">
import { authClient } from "~/lib/auth-client";

const description =
  "A script-writing agent that learns from people's content.";
const requestUrl = useRequestURL();
const canonicalUrl = `${requestUrl.origin}/`;
const socialImageUrl = `${requestUrl.origin}/og.png`;

useHead({
  htmlAttrs: {
    "data-theme": "dark",
  },
  link: [{ rel: "canonical", href: canonicalUrl }],
});

useSeoMeta({
  title: "OpenFranz | Script-writing agent",
  description,
  robots: "index, follow, max-image-preview:large",
  themeColor: "#0d0d0c",
  ogTitle: "OpenFranz | Script-writing agent",
  ogDescription: description,
  ogType: "website",
  ogUrl: canonicalUrl,
  ogSiteName: "OpenFranz",
  ogLocale: "en_US",
  ogImage: socialImageUrl,
  ogImageSecureUrl: socialImageUrl,
  ogImageType: "image/png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: "OpenFranz logo and title on a dark dithered background",
  twitterCard: "summary_large_image",
  twitterTitle: "OpenFranz | Script-writing agent",
  twitterDescription: description,
  twitterImage: socialImageUrl,
  twitterImageAlt: "OpenFranz logo and title on a dark dithered background",
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
    <UiDither
      class="landing-shader"
      color-back="#0d0d0c"
      color-front="#1e1c19"
      shape="pulse"
      type="8x8"
      :size="2.2"
      :speed="0.45"
    />
    <div class="landing-veil" aria-hidden="true" />

    <section class="center" aria-labelledby="landing-title">
      <BrandMark class="mark" />

      <div class="copy">
        <h1 id="landing-title">OpenFranz</h1>
        <p>
          A script-writing agent that learns from people's content.
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
        {{ signingIn ? "Connecting..." : "Continue with Google" }}
      </button>

      <p v-if="signInError" class="error" role="alert">{{ signInError }}</p>
    </section>
  </main>
</template>

<style scoped>
.landing {
  --landing-bg: #0d0d0c;
  --landing-fg: #f2efe8;
  --landing-muted: #8f8b83;
  --landing-border: rgb(242 239 232 / 0.18);
  position: relative;
  display: grid;
  min-height: 100dvh;
  place-items: center;
  overflow: hidden;
  padding: 24px;
  background: var(--landing-bg);
  color: var(--landing-fg);
}

.landing-shader {
  position: absolute;
  inset: 0;
  opacity: 0.9;
  mask-image: radial-gradient(
    circle at 100% 100%,
    #000 0%,
    rgb(0 0 0 / 0.9) 38%,
    rgb(0 0 0 / 0.45) 72%,
    rgb(0 0 0 / 0.28) 100%
  );
}

.landing-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      circle at 50% 44%,
      color-mix(in oklab, var(--landing-bg) 92%, transparent) 0%,
      color-mix(in oklab, var(--landing-bg) 58%, transparent) 34%,
      transparent 70%
    ),
    linear-gradient(
      135deg,
      color-mix(in oklab, var(--landing-bg) 45%, transparent) 0%,
      transparent 52%
    );
  pointer-events: none;
}

.center {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: 760px;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.mark {
  width: clamp(64px, 8vw, 88px);
  height: auto;
  color: var(--landing-fg);
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
  font-size: 16px;
  line-height: 1.55;
  color: var(--landing-muted);
  white-space: nowrap;
  animation: arrive 600ms 150ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.action {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  margin-top: 28px;
  padding: 0 18px;
  border: 1px solid var(--landing-fg);
  border-radius: 4px;
  background: var(--landing-fg);
  color: var(--landing-bg);
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
  border-color: color-mix(in oklab, var(--landing-fg) 85%, var(--landing-bg));
  background: color-mix(in oklab, var(--landing-fg) 85%, var(--landing-bg));
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
  color: var(--destructive);
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

@media (max-width: 640px) {
  .copy p {
    white-space: normal;
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
