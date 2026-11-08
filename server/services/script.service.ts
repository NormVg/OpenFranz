import type {
  ScriptRecord,
  ScriptVersionSource,
  ScriptWithVersions,
} from "../../shared/types/script";
import {
  createScriptSchema,
  restoreScriptVersionSchema,
  saveScriptVersionSchema,
  scriptIdSchema,
} from "../../shared/schemas/script";
import { createScriptSlug, uniqueScriptSlug } from "../../shared/utils/script";
import * as scriptRepository from "../repositories/script.repository";
import { ServiceError } from "../utils/service-error";

function parseScriptId(id: string | undefined): string {
  const parsed = scriptIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new ServiceError(400, "Invalid script id.");
  }
  return parsed.data;
}

async function withVersions(script: ScriptRecord): Promise<ScriptWithVersions> {
  return { ...script, versions: await scriptRepository.listVersions(script.id) };
}

export function listScripts(): Promise<ScriptRecord[]> {
  return scriptRepository.listAll();
}

export async function getScript(
  idOrSlug: string | undefined,
): Promise<ScriptWithVersions> {
  if (!idOrSlug) {
    throw new ServiceError(400, "A script id or slug is required.");
  }

  const byId = scriptIdSchema.safeParse(idOrSlug);
  const script = byId.success
    ? await scriptRepository.findById(byId.data)
    : await scriptRepository.findBySlug(idOrSlug);

  if (!script) {
    throw new ServiceError(404, "Script not found.");
  }

  return withVersions(script);
}

export async function createScript(
  input: unknown,
  source: ScriptVersionSource,
): Promise<ScriptWithVersions> {
  const parsed = createScriptSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid script.",
    );
  }

  const slug = uniqueScriptSlug(
    createScriptSlug(parsed.data.title),
    await scriptRepository.listSlugs(),
  );

  const script = await scriptRepository.create({
    title: parsed.data.title,
    slug,
    brand: parsed.data.brand,
  });

  await scriptRepository.insertVersion(script.id, {
    title: parsed.data.title,
    brand: parsed.data.brand,
    content: parsed.data.content,
    note: parsed.data.note,
    source,
  });

  const created = await scriptRepository.findById(script.id);
  if (!created) {
    throw new ServiceError(500, "The script could not be saved.");
  }

  return withVersions(created);
}

export async function saveVersion(
  id: string | undefined,
  input: unknown,
  source: ScriptVersionSource,
): Promise<ScriptWithVersions> {
  const scriptId = parseScriptId(id);
  const parsed = saveScriptVersionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid script update.",
    );
  }

  const script = await scriptRepository.findById(scriptId);
  if (!script) {
    throw new ServiceError(404, "Script not found.");
  }

  const title = parsed.data.title ?? script.title;
  const brand = parsed.data.brand ?? script.brand;

  await scriptRepository.insertVersion(scriptId, {
    title,
    brand,
    content: parsed.data.content,
    note: parsed.data.note,
    source,
  });

  await scriptRepository.updateFields(scriptId, { title, brand });
  const updated = await scriptRepository.findById(scriptId);
  if (!updated) {
    throw new ServiceError(404, "Script not found.");
  }

  return withVersions(updated);
}

/**
 * Restoring never rewrites history. The restored content is appended as a
 * new version, so the trail of every save survives.
 */
export async function restoreVersion(
  id: string | undefined,
  input: unknown,
  source: ScriptVersionSource,
): Promise<ScriptWithVersions> {
  const scriptId = parseScriptId(id);
  const parsed = restoreScriptVersionSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      400,
      parsed.error.issues[0]?.message ?? "Invalid version.",
    );
  }

  const version = await scriptRepository.findVersion(
    scriptId,
    parsed.data.versionNumber,
  );
  if (!version) {
    throw new ServiceError(404, "That version does not exist.");
  }

  return saveVersion(
    scriptId,
    {
      title: version.title,
      brand: version.brand,
      content: version.content,
      note: `Restored from v${version.versionNumber}.`,
    },
    source,
  );
}

export async function deleteScript(id: string | undefined): Promise<void> {
  const deleted = await scriptRepository.deleteById(parseScriptId(id));
  if (!deleted) {
    throw new ServiceError(404, "Script not found.");
  }
}

export type StoreScriptValues = {
  idOrSlug?: string;
  title: string;
  brand?: string;
  content: string;
  note?: string;
};

/**
 * The agent's entry point. Saves a new script, or appends a version to an
 * existing one when the agent names the id or slug it is revising.
 */
export async function storeScript(
  values: StoreScriptValues,
  source: ScriptVersionSource,
): Promise<ScriptWithVersions> {
  if (values.idOrSlug) {
    return saveVersion(
      scriptIdSchema.safeParse(values.idOrSlug).success
        ? values.idOrSlug
        : (await getScript(values.idOrSlug)).id,
      {
        title: values.title,
        brand: values.brand ?? "",
        content: values.content,
        note: values.note ?? "",
      },
      source,
    );
  }

  return createScript(
    {
      title: values.title,
      brand: values.brand ?? "",
      content: values.content,
      note: values.note ?? "",
    },
    source,
  );
}
