import { defineVfsHandler, vfs } from "~~/server/utils/vfs";
import { requireUser } from "~~/server/utils/require-user";

export default defineVfsHandler(async (event) => {
  await requireUser(event);
  return vfs.graph();
});
