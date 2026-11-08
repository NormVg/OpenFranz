/**
 * Tracks the dark state of the document theme. MarkdownRender wants an
 * isDark flag, and the explorer pages live outside the chat's theme prop
 * chain, so they read the theme attribute the same way the file preview
 * does.
 */
export function useIsDark() {
  const isDark = ref(true);
  let observer: MutationObserver | null = null;

  function read() {
    isDark.value = document.documentElement.dataset.theme !== "light";
  }

  onMounted(() => {
    read();

    observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return isDark;
}
