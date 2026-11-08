export type ScriptVersionSource = "user" | "agent";

export type ScriptRecord = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  versionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ScriptVersionRecord = {
  id: string;
  scriptId: string;
  versionNumber: number;
  title: string;
  brand: string;
  content: string;
  note: string;
  source: ScriptVersionSource;
  createdAt: string;
};

export type ScriptWithVersions = ScriptRecord & {
  versions: ScriptVersionRecord[];
};

export type ScriptInput = {
  title: string;
  brand?: string;
  content: string;
  note?: string;
};
