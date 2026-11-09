import { updateStrategy } from "~~/server/services/strategy.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  return updateStrategy(getRouterParam(event, "id"), await readBody(event));
});
