import { canonicalInstagramUrl } from "../../shared/utils/instagram";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Share links (instagram.com/share/<id>) carry no shortcode. Instagram
 * answers them with a redirect to the real post URL, so the enqueue route
 * resolves the redirect once and queues the canonical link. Returns null
 * when Instagram does not cooperate; the caller turns that into a clear
 * validation error instead of queueing a job that cannot run.
 */
export async function resolveInstagramShareUrl(
  url: string,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": USER_AGENT },
    });

    const location = response.headers.get("location");
    return location ? canonicalInstagramUrl(location) : null;
  } catch {
    return null;
  }
}
