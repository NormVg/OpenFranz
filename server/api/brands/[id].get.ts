import { getBrand } from "~~/server/services/brand.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  return getBrand(getRouterParam(event, "id"));
});
