import { deleteItem } from "~~/server/services/plan.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  await deleteItem(getRouterParam(event, "id"));
  return { ok: true };
});
