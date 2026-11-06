import { updateChat } from "~~/server/services/chat.service";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  return updateChat(getRouterParam(event, "id"), await readBody(event));
});
