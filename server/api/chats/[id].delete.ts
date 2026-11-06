import { deleteChatForUser } from "~~/server/services/chat.service";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  await deleteChatForUser(user.id, getRouterParam(event, "id"));
  return { ok: true };
});
