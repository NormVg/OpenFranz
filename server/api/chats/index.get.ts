import { listChats } from "~~/server/services/chat.service";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  return listChats();
});
