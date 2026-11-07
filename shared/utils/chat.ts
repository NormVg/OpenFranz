import { DEFAULT_CHAT_TITLE } from "../schemas/chat";

export function createTitle(input: string): string {
  const text = input
    .replace(/\s+/g, " ")
    .replace(/[`*_#>]/g, "")
    .trim();

  if (!text) return DEFAULT_CHAT_TITLE;
  return text.length > 72 ? `${text.slice(0, 69).trimEnd()}...` : text;
}

/**
 * Appends a new transcript to the existing draft. Recording again must extend
 * the message, never replace what the user already typed or dictated.
 */
export function appendTranscript(current: string, transcript: string): string {
  const base = current.trimEnd();
  const addition = transcript.trim();

  if (!addition) return base;
  return base ? `${base} ${addition}` : addition;
}
