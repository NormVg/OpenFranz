export const DEEP_MODE_MARKER = "[[deep]]";

const DEEP_MODE_PATTERN = /^\[\[deep\]\]\s*/;

/**
 * Marks a message as a Deep mode request. The agent reads the marker and asks
 * gap-filling questions before it writes the deliverable.
 */
export function withDeepMode(text: string): string {
  return text ? `${DEEP_MODE_MARKER} ${text}` : DEEP_MODE_MARKER;
}

export function parseDeepMode(text: string): {
  deep: boolean;
  text: string;
} {
  const match = text.match(DEEP_MODE_PATTERN);

  if (!match) {
    return { deep: false, text };
  }

  return { deep: true, text: text.slice(match[0].length) };
}
