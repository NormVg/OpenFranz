import type { BrandInput, BrandRecord } from "~~/shared/types/brand";

export const brandService = {
  list(): Promise<BrandRecord[]> {
    return $fetch<BrandRecord[]>("/api/brands");
  },

  get(idOrSlug: string): Promise<BrandRecord> {
    return $fetch<BrandRecord>(`/api/brands/${encodeURIComponent(idOrSlug)}`);
  },

  create(input: BrandInput): Promise<BrandRecord> {
    return $fetch<BrandRecord>("/api/brands", {
      method: "POST",
      body: input,
    });
  },

  update(id: string, input: Partial<BrandInput>): Promise<BrandRecord> {
    return $fetch<BrandRecord>(`/api/brands/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  remove(id: string): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>(`/api/brands/${id}`, {
      method: "DELETE",
    });
  },
};
