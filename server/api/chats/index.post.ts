import { createChatForUser } from "~~/server/services/chat.service";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return createChatForUser(user.id, await readBody(event));
});
