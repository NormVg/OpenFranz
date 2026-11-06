export type InstagramMediaItem = {
  kind: "video" | "image";
  url: string;
};

export type InstagramMediaResult = {
  sourceUrl: string;
  type: "video" | "image";
  total: number;
  media: InstagramMediaItem[];
};

export type InstagramApiPayload = {
  type?: string;
  url?: string;
  thumbnail?: string | null;
  total_media?: number;
  [key: string]: unknown;
};

const INSTAGRAM_POST_PATTERN =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?$/;

export function isInstagramPostUrl(value: string): boolean {
  return INSTAGRAM_POST_PATTERN.test(value.trim());
}

export function normalizeInstagramPayload(
  sourceUrl: string,
  payload: InstagramApiPayload,
): InstagramMediaResult {
  const kind: "video" | "image" = payload.type === "video" ? "video" : "image";
  const media: InstagramMediaItem[] = [];
  const seen = new Set<string>();

  const push = (value: unknown) => {
    if (typeof value !== "string" || value.length === 0 || seen.has(value)) {
      return;
    }

    seen.add(value);
    media.push({ kind, url: value });
  };

  push(payload.url);

  const total =
    typeof payload.total_media === "number" ? payload.total_media : 1;

  for (let index = 1; index <= Math.max(total, 1); index += 1) {
    push(payload[`media_url_${index}`]);
  }

  return {
    sourceUrl,
    type: kind,
    total: media.length,
    media,
  };
}
