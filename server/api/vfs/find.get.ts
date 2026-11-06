import { defineVfsHandler, vfs } from "~~/server/utils/vfs";
import { requireUser } from "~~/server/utils/require-user";

export default defineVfsHandler(async (event) => {
  await requireUser(event);
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q : "";
  const limit = Number(query.limit ?? 20);

  return vfs.find(q, Number.isFinite(limit) ? limit : 20);
});
