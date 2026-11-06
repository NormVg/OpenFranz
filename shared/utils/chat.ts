import { DEFAULT_CHAT_TITLE } from "../schemas/chat";

export function createTitle(input: string): string {
  const text = input
    .replace(/\s+/g, " ")
    .replace(/[`*_#>]/g, "")
    .trim();

  if (!text) return DEFAULT_CHAT_TITLE;
  return text.length > 72 ? `${text.slice(0, 69).trimEnd()}...` : text;
}
