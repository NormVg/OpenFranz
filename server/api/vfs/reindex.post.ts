import { vfs } from "~~/server/utils/vfs";
import { requireUser } from "~~/server/utils/require-user";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  return { indexed: await vfs.reindexLinks() };
});
