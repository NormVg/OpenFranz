import type {
  PlannerItemInput,
  PlannerItemRecord,
} from "~~/shared/types/plan";

export const planService = {
  list(): Promise<PlannerItemRecord[]> {
    return $fetch<PlannerItemRecord[]>("/api/plan");
  },

  create(input: PlannerItemInput): Promise<PlannerItemRecord> {
    return $fetch<PlannerItemRecord>("/api/plan", {
      method: "POST",
      body: input,
    });
  },

  update(
    id: string,
    input: Partial<PlannerItemInput>,
  ): Promise<PlannerItemRecord> {
    return $fetch<PlannerItemRecord>(`/api/plan/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  remove(id: string): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>(`/api/plan/${id}`, {
      method: "DELETE",
    });
  },
};
