import { deleteChat } from "~~/server/services/chat.service";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  await deleteChat(getRouterParam(event, "id"));
  return { ok: true };
});
