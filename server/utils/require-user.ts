import type { H3Event } from "h3";
import { getAuth } from "./auth";

export async function requireUser(event: H3Event) {
  const session = await getAuth().api.getSession({ headers: event.headers });

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return session.user;
}
