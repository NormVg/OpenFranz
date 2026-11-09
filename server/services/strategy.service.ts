import type { StrategyRecord } from "../../shared/types/strategy";
import {
  createStrategySchema,
  strategyIdSchema,
  updateStrategySchema,
} from "../../shared/schemas/strategy";
import * as strategyRepository from "../repositories/strategy.repository";
import type { StrategyValues } from "../repositories/strategy.repository";
import { ServiceError } from "../utils/service-error";

function parseStrategyId(id: string | undefined): string {
  const parsed = strategyIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new ServiceError(400, "Invalid strategy id.");
  }
  return parsed.data;
}

export function listStrategies(): Promise<StrategyRecord[]> {
  return strategyRepository.listAll();
}

export function getActiveStrategy(): Promise<StrategyRecord | null> {
  return strategyRepository.findActive();
}

/**
 * Read-by-id for consumers that treat "no such strategy" as an answer, not an
 * error: a malformed id is simply not found. Mutating paths still reject.
 */
export async function getStrategy(
  id: string | undefined,
): Promise<StrategyRecord | null> {
  const parsed = strategyIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return strategyRepository.findById(parsed.data);
}

export async function createStrategy(
  input: unknown,
): Promise<StrategyRecord> {
  const parsed = createStrategySchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid strategy.",
    );
  }

  // The first strategy becomes active automatically so the planner and the
  // agent have a working default.
  const activate =
    (parsed.data.isActive ?? false) ||
    (await strategyRepository.countActive()) === 0;

  if (activate) await strategyRepository.deactivateAll();

  return strategyRepository.create({
    title: parsed.data.title,
    content: parsed.data.content,
    isActive: activate,
  });
}

export async function updateStrategy(
  id: string | undefined,
  input: unknown,
): Promise<StrategyRecord> {
  const strategyId = parseStrategyId(id);
  const parsed = updateStrategySchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid strategy update.",
    );
  }

  const existing = await strategyRepository.findById(strategyId);
  if (!existing) {
    throw new ServiceError(404, "Strategy not found.");
  }

  // Exactly one strategy is active at a time; activating one retires the rest.
  if (parsed.data.isActive === true) {
    await strategyRepository.deactivateAll();
  }

  const values: Partial<StrategyValues> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      (values as Record<string, unknown>)[key] = value;
    }
  }

  const updated = await strategyRepository.update(strategyId, values);
  if (!updated) {
    throw new ServiceError(404, "Strategy not found.");
  }

  return updated;
}

export async function deleteStrategy(id: string | undefined): Promise<void> {
  const deleted = await strategyRepository.deleteById(parseStrategyId(id));
  if (!deleted) {
    throw new ServiceError(404, "Strategy not found.");
  }
}
