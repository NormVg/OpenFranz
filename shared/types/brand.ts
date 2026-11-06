export type BrandProduct = {
  name: string;
  description: string;
  features: string[];
  pricing: string;
};

export type BrandRecord = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  website: string;
  audience: string;
  tone: string;
  products: BrandProduct[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandInput = {
  name: string;
  summary?: string;
  website?: string;
  audience?: string;
  tone?: string;
  products?: BrandProduct[];
  notes?: string;
};
