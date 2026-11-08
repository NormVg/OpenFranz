import type {
  ScriptInput,
  ScriptRecord,
  ScriptWithVersions,
} from "~~/shared/types/script";

export const scriptService = {
  list(): Promise<ScriptRecord[]> {
    return $fetch<ScriptRecord[]>("/api/scripts");
  },

  create(input: ScriptInput): Promise<ScriptWithVersions> {
    return $fetch<ScriptWithVersions>("/api/scripts", {
      method: "POST",
      body: input,
    });
  },

  get(id: string): Promise<ScriptWithVersions> {
    return $fetch<ScriptWithVersions>(`/api/scripts/${id}`);
  },

  saveVersion(
    id: string,
    input: ScriptInput & { note?: string },
  ): Promise<ScriptWithVersions> {
    return $fetch<ScriptWithVersions>(`/api/scripts/${id}`, {
      method: "PATCH",
      body: input,
    });
  },

  restore(id: string, versionNumber: number): Promise<ScriptWithVersions> {
    return $fetch<ScriptWithVersions>(`/api/scripts/${id}/restore`, {
      method: "POST",
      body: { versionNumber },
    });
  },

  remove(id: string): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>(`/api/scripts/${id}`, {
      method: "DELETE",
    });
  },
};
