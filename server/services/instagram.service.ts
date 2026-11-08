import { instagram } from "@jerrycoder/instagram-api";
import type {
  InstagramApiPayload,
  InstagramMediaResult,
} from "../../shared/utils/instagram";
import {
  canonicalInstagramUrl,
  normalizeInstagramPayload,
} from "../../shared/utils/instagram";
import { ServiceError } from "../utils/service-error";

export async function fetchInstagramMedia(
  url: string,
): Promise<InstagramMediaResult> {
  const sourceUrl = canonicalInstagramUrl(url);

  if (!sourceUrl) {
    throw new ServiceError(
      400,
      "Only public Instagram post or reel URLs are supported.",
    );
  }

  let payload: InstagramApiPayload;

  try {
    payload = await instagram(sourceUrl, { timeout: 20000 });
  } catch (error) {
    throw new ServiceError(
      502,
      error instanceof Error
        ? error.message
        : "Unable to fetch that Instagram post.",
    );
  }

  return normalizeInstagramPayload(sourceUrl, payload);
}
