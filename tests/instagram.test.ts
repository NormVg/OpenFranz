import assert from "node:assert/strict";
import test from "node:test";
import {
  isInstagramPostUrl,
  normalizeInstagramPayload,
} from "../shared/utils/instagram.ts";

test("accepts public post and reel URLs", () => {
  assert.equal(
    isInstagramPostUrl("https://www.instagram.com/reel/Dbn-XJhk0_-/"),
    true,
  );
  assert.equal(isInstagramPostUrl("https://instagram.com/p/DalfZ3Jn8yi/"), true);
  assert.equal(
    isInstagramPostUrl("https://www.instagram.com/reels/abc123/"),
    true,
  );
  assert.equal(isInstagramPostUrl("https://www.instagram.com/tv/abc123/"), true);
});

test("rejects profiles, stories, and other hosts", () => {
  assert.equal(
    isInstagramPostUrl("https://www.instagram.com/instagram/"),
    false,
  );
  assert.equal(
    isInstagramPostUrl("https://www.instagram.com/stories/instagram/123/"),
    false,
  );
  assert.equal(isInstagramPostUrl("https://example.com/reel/abc/"), false);
  assert.equal(isInstagramPostUrl(""), false);
});

test("normalizes a reel payload", () => {
  const result = normalizeInstagramPayload(
    "https://www.instagram.com/reel/abc/",
    { type: "video", url: "https://cdn/video.mp4" },
  );

  assert.equal(result.type, "video");
  assert.equal(result.total, 1);
  assert.deepEqual(result.media, [
    { kind: "video", url: "https://cdn/video.mp4" },
  ]);
});

test("normalizes a carousel payload without duplicates", () => {
  const result = normalizeInstagramPayload(
    "https://www.instagram.com/p/abc/",
    {
      type: "image",
      url: "https://cdn/1.jpg",
      media_url_1: "https://cdn/1.jpg",
      media_url_2: "https://cdn/2.jpg",
      total_media: 2,
    },
  );

  assert.equal(result.type, "image");
  assert.equal(result.total, 2);
  assert.deepEqual(
    result.media.map((item) => item.url),
    ["https://cdn/1.jpg", "https://cdn/2.jpg"],
  );
});
