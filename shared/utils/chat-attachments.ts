export const MAX_CHAT_ATTACHMENTS = 4;
export const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface ChatAttachmentCandidate {
  type: string;
  size: number;
  name?: string;
}

export function isSupportedChatImage(file: ChatAttachmentCandidate): boolean {
  return file.type.startsWith("image/");
}

export function validateChatAttachment(
  file: ChatAttachmentCandidate,
  currentCount: number,
): string | null {
  if (currentCount >= MAX_CHAT_ATTACHMENTS) {
    return `You can attach up to ${MAX_CHAT_ATTACHMENTS} images.`;
  }

  if (!isSupportedChatImage(file)) {
    return "Only image attachments are supported.";
  }

  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    return "Each image must be 10 MB or smaller.";
  }

  return null;
}
