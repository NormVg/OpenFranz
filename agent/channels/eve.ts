import { none } from "eve/channels/auth";
import type { AuthResult } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

type SessionPayload = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
} | null;

/**
 * The browser talks to the eve service through the app's domain, so the
 * better-auth session cookie is available. Verify it against the app before
 * accepting the request.
 */
async function sessionAuth(request: Request): Promise<AuthResult | null> {
  const cookie = request.headers.get("cookie");
  const baseUrl =
    process.env.BETTER_AUTH_URL ?? process.env.RENDER_EXTERNAL_URL;

  if (!cookie || !baseUrl) return null;

  try {
    const response = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as SessionPayload;
    const user = payload?.user;
    if (!user?.id) return null;

    return {
      attributes: {
        email: user.email ?? "",
        name: user.name ?? "",
      },
      authenticator: "better-auth",
      principalId: user.id,
      principalType: "user",
    };
  } catch {
    return null;
  }
}

export default eveChannel({
  auth: process.env.VERCEL ? [sessionAuth] : [none()],
});
