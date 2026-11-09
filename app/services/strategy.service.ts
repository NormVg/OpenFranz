import type {
  StrategyInput,
  StrategyRecord,
} from "~~/shared/types/strategy";

export const strategyService = {
  list(): Promise<StrategyRecord[]> {
    return $fetch<StrategyRecord[]>("/api/strategies");
  },

  create(input: StrategyInput): Promise<StrategyRecord> {
    return $fetch<StrategyRecord>("/api/strategies", {
      method: "POST",
      body: input,
    });
  },

  update(
    id: string,
    input: Partial<StrategyInput>,
  ): Promise<StrategyRecord> {
    return $fetch<StrategyRecord>(`/api/strategies/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  remove(id: string): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>(`/api/strategies/${id}`, {
      method: "DELETE",
    });
  },
};
