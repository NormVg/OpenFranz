import { deleteBrand } from "~~/server/services/brand.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  await deleteBrand(getRouterParam(event, "id"));
  return { ok: true };
});
