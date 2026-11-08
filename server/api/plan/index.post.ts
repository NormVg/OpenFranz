import { createItem } from "~~/server/services/plan.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { requireUser } from "~~/server/utils/require-user";

export default defineServiceHandler(async (event) => {
  await requireUser(event);
  return createItem(await readBody(event));
});
