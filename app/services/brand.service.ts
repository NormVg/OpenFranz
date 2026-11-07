import type { BrandInput, BrandRecord } from "~~/shared/types/brand";
import {
  cachedResponse,
  invalidateResponseCache,
} from "~/utils/response-cache";

const BRAND_TTL_MS = 15_000;

export const brandService = {
  list(): Promise<BrandRecord[]> {
    return cachedResponse("brands:list", BRAND_TTL_MS, () =>
      $fetch<BrandRecord[]>("/api/brands"),
    );
  },

  get(idOrSlug: string): Promise<BrandRecord> {
    return cachedResponse(`brands:item:${idOrSlug}`, BRAND_TTL_MS, () =>
      $fetch<BrandRecord>(`/api/brands/${encodeURIComponent(idOrSlug)}`),
    );
  },

  async create(input: BrandInput): Promise<BrandRecord> {
    const brand = await $fetch<BrandRecord>("/api/brands", {
      method: "POST",
      body: input,
    });
    invalidateResponseCache("brands:");
    return brand;
  },

  async update(id: string, input: Partial<BrandInput>): Promise<BrandRecord> {
    const brand = await $fetch<BrandRecord>(`/api/brands/${id}`, {
      method: "PATCH",
      body: input,
    });
    invalidateResponseCache("brands:");
    return brand;
  },

  async remove(id: string): Promise<{ ok: boolean }> {
    const result = await $fetch<{ ok: boolean }>(`/api/brands/${id}`, {
      method: "DELETE",
    });
    invalidateResponseCache("brands:");
    return result;
  },
};
