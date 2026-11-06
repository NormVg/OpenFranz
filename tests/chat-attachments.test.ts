import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_CHAT_ATTACHMENTS,
  MAX_CHAT_ATTACHMENT_BYTES,
  isSupportedChatImage,
  validateChatAttachment,
} from "../shared/utils/chat-attachments.ts";

test("accepts supported image types", () => {
  assert.equal(isSupportedChatImage({ type: "image/png", size: 100 }), true);
  assert.equal(isSupportedChatImage({ type: "image/jpeg", size: 100 }), true);
  assert.equal(isSupportedChatImage({ type: "application/pdf", size: 100 }), false);
});

test("rejects non-images and oversized images", () => {
  assert.equal(
    validateChatAttachment({ type: "text/plain", size: 10 }, 0),
    "Only image attachments are supported.",
  );
  assert.equal(
    validateChatAttachment(
      { type: "image/png", size: MAX_CHAT_ATTACHMENT_BYTES + 1 },
      0,
    ),
    "Each image must be 10 MB or smaller.",
  );
});

test("enforces the attachment count limit", () => {
  assert.equal(
    validateChatAttachment(
      { type: "image/png", size: 100 },
      MAX_CHAT_ATTACHMENTS,
    ),
    `You can attach up to ${MAX_CHAT_ATTACHMENTS} images.`,
  );
  assert.equal(
    validateChatAttachment({ type: "image/png", size: 100 }, 0),
    null,
  );
});
