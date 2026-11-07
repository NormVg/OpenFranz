/**
 * The app and landing page both own their scroll containers, so the document
 * itself must never scroll. Disabling the browser's scroll restoration keeps a
 * reload from restoring a stale document offset before the layout settles.
 */
export default defineNuxtPlugin(() => {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
});
