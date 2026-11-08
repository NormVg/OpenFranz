import { saveVersion } from "~~/server/services/script.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  return saveVersion(
    getRouterParam(event, "id"),
    await readBody(event),
    "user",
  );
});
