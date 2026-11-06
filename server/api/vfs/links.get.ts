import { vfs } from "~~/server/utils/vfs";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const path = getQuery(event).path;

  if (typeof path !== "string") {
    throw createError({ statusCode: 400, statusMessage: "A file path is required." });
  }

  return vfs.links(path);
});
