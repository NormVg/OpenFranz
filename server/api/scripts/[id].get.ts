import { getScript } from "~~/server/services/script.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  return getScript(getRouterParam(event, "id"));
});
