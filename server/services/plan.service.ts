import type { PlannerItemRecord } from "../../shared/types/plan";
import {
  createPlannerItemSchema,
  plannerItemIdSchema,
  updatePlannerItemSchema,
} from "../../shared/schemas/plan";
import * as plannerRepository from "../repositories/plan.repository";
import type { PlannerItemValues } from "../repositories/plan.repository";
import { ServiceError } from "../utils/service-error";

function parseItemId(id: string | undefined): string {
  const parsed = plannerItemIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new ServiceError(400, "Invalid planned item id.");
  }
  return parsed.data;
}

export function listItems(): Promise<PlannerItemRecord[]> {
  return plannerRepository.listAll();
}

export async function createItem(input: unknown): Promise<PlannerItemRecord> {
  const parsed = createPlannerItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid planned item.",
    );
  }

  return plannerRepository.create(parsed.data);
}

export async function updateItem(
  id: string | undefined,
  input: unknown,
): Promise<PlannerItemRecord> {
  const itemId = parseItemId(id);
  const parsed = updatePlannerItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid planned item update.",
    );
  }

  const existing = await plannerRepository.findById(itemId);
  if (!existing) {
    throw new ServiceError(404, "Planned item not found.");
  }

  const values: Partial<PlannerItemValues> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      (values as Record<string, unknown>)[key] = value;
    }
  }

  const updated = await plannerRepository.update(itemId, values);
  if (!updated) {
    throw new ServiceError(404, "Planned item not found.");
  }

  return updated;
}

export async function deleteItem(id: string | undefined): Promise<void> {
  const deleted = await plannerRepository.deleteById(parseItemId(id));
  if (!deleted) {
    throw new ServiceError(404, "Planned item not found.");
  }
}
