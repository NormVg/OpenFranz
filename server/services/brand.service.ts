import type { BrandRecord } from "../../shared/types/brand";
import {
  brandIdSchema,
  createBrandSchema,
  updateBrandSchema,
} from "../../shared/schemas/brand";
import { createBrandSlug, uniqueBrandSlug } from "../../shared/utils/brand";
import * as brandRepository from "../repositories/brand.repository";
import type { BrandValues } from "../repositories/brand.repository";
import { ServiceError } from "../utils/service-error";

function parseBrandId(id: string | undefined): string {
  const parsed = brandIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new ServiceError(400, "Invalid brand id.");
  }
  return parsed.data;
}

export function listBrands(): Promise<BrandRecord[]> {
  return brandRepository.listAll();
}

export async function getBrand(
  idOrSlug: string | undefined,
): Promise<BrandRecord> {
  if (!idOrSlug) {
    throw new ServiceError(400, "A brand id or slug is required.");
  }

  const byId = brandIdSchema.safeParse(idOrSlug);
  const brand = byId.success
    ? await brandRepository.findById(byId.data)
    : await brandRepository.findBySlug(idOrSlug);

  if (!brand) {
    throw new ServiceError(404, "Brand not found.");
  }

  return brand;
}

export async function createBrand(input: unknown): Promise<BrandRecord> {
  const parsed = createBrandSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid brand.",
    );
  }

  const slug = uniqueBrandSlug(
    createBrandSlug(parsed.data.name),
    await brandRepository.listSlugs(),
  );

  return brandRepository.create({ ...parsed.data, slug });
}

export async function updateBrand(
  id: string | undefined,
  input: unknown,
): Promise<BrandRecord> {
  const brandId = parseBrandId(id);
  const parsed = updateBrandSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid brand update.",
    );
  }

  const existing = await brandRepository.findById(brandId);
  if (!existing) {
    throw new ServiceError(404, "Brand not found.");
  }

  const values: Partial<BrandValues> = {};

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      (values as Record<string, unknown>)[key] = value;
    }
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const slugs = await brandRepository.listSlugs();
    values.slug = uniqueBrandSlug(
      createBrandSlug(parsed.data.name),
      slugs.filter((slug) => slug !== existing.slug),
    );
  }

  const updated = await brandRepository.update(brandId, values);
  if (!updated) {
    throw new ServiceError(404, "Brand not found.");
  }

  return updated;
}

export async function deleteBrand(id: string | undefined): Promise<void> {
  const deleted = await brandRepository.deleteById(parseBrandId(id));
  if (!deleted) {
    throw new ServiceError(404, "Brand not found.");
  }
}
