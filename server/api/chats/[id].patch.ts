import { updateChatForUser } from "~~/server/services/chat.service";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return updateChatForUser(
    user.id,
    getRouterParam(event, "id"),
    await readBody(event),
  );
});
