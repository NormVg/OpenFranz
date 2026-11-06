import { vfs } from "~~/server/utils/vfs";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const path = getQuery(event).path;
  return vfs.list(typeof path === "string" ? path : "/");
});
