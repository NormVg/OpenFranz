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

/**
 * Accepts the URL forms people actually paste:
 *
 * - clean links: https://www.instagram.com/p/DalfZ3Jn8yi/
 * - app-copied links: ...?igsh=cHFnOGowN3li...&img_index=1
 * - comment permalinks: .../reel/DXXXXXXXX/c/178.../
 * - the /reels/ and /tv/ variants
 *
 * Anything that survives this pattern is canonicalized to the plain
 * `instagram.com/<kind>/<shortcode>/` form, so the queue and the worker
 * always store one URL shape.
 */
const INSTAGRAM_POST_PATTERN =
  /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)(?:\/c\/[A-Za-z0-9_-]+)?\/?(?:[?#].*)?$/i;

const INSTAGRAM_SHARE_PATTERN =
  /^https?:\/\/(?:www\.)?instagram\.com\/share\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/i;

/**
 * Returns the canonical post URL, or null when the value is not a public
 * post or reel link. Query strings and fragments are stripped and the
 * `/reels/` variant is folded onto `/reel/`.
 */
export function canonicalInstagramUrl(value: string): string | null {
  const match = value.trim().match(INSTAGRAM_POST_PATTERN);
  if (!match) return null;

  const kind = match[1]?.toLowerCase() === "reels" ? "reel" : match[1]!;
  const shortcode = match[2]!;

  return `https://www.instagram.com/${kind}/${shortcode}/`;
}

export function isInstagramPostUrl(value: string): boolean {
  return canonicalInstagramUrl(value) !== null;
}

/**
 * Share links carry no shortcode: instagram.com redirects them to the real
 * post URL. The enqueue route resolves them before queueing the job.
 */
export function isInstagramShareUrl(value: string): boolean {
  return INSTAGRAM_SHARE_PATTERN.test(value.trim());
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
