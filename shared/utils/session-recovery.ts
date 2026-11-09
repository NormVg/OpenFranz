const EVE_ERROR_LINEAGE = Symbol.for("eve.error.lineage");

/**
 * Structural narrow for eve's `ClientError` (an HTTP-status failure carrying a
 * `code`), without importing the runtime class: the app bundler cannot load
 * `eve/client`'s entry, and `ClientError.is()` itself matches on exactly this
 * lineage symbol, so real instances and subclasses satisfy the same check.
 */
function isClientError(
  error: unknown,
): error is { readonly status: number; readonly code: string } {
  if (typeof error !== "object" || error === null) return false;

  const lineage = Reflect.get(error, EVE_ERROR_LINEAGE);
  return Array.isArray(lineage) && lineage.includes("ClientError");
}

/**
 * What the app should do with a persisted eve session cursor.
 *
 * - `"recover"`: the eve runtime can no longer execute this session, so the
 *   chat should drop the cursor and its recorded events and continue fresh.
 * - `"resume"`: keep the cursor and resume normally.
 */
export type SessionProbeVerdict = "recover" | "resume";

/**
 * Decides whether a persisted session can still be resumed from a single
 * status-only probe of `/eve/v1/session/<id>/stream`.
 *
 * Only definitive answers clear the cursor: a 404 means the runtime no longer
 * knows the session, and a 409 `session_stranded` means another eve version
 * built it, so it can never execute on this deployment. Every other outcome,
 * including probe timeouts and network failures, falls back to a normal
 * resume where the eve client's own retry policy applies.
 */
export function classifySessionProbe(
  status: number | null,
  body?: string | null,
): SessionProbeVerdict {
  if (status === 404) return "recover";
  if (status === 409 && readErrorCode(body) === "session_stranded") {
    return "recover";
  }

  return "resume";
}

/**
 * Reports whether a live eve client failure means the session is permanently
 * gone and the chat should be recovered. Transient failures (network drops,
 * 5xx, unauthorized, sessions that are merely not active yet) stay false so
 * they surface like any other error.
 */
export function isStaleSessionError(error: unknown): boolean {
  if (!isClientError(error)) return false;

  return (
    error.status === 404 ||
    error.code === "session_stranded" ||
    error.code === "session_version_unsupported"
  );
}

function readErrorCode(body: string | null | undefined): string | undefined {
  if (!body) return undefined;

  try {
    const parsed: unknown = JSON.parse(body);
    if (isRecordWithCode(parsed)) return parsed.code;
  } catch {
    // A non-JSON body carries no eve error code.
  }

  return undefined;
}

function isRecordWithCode(value: unknown): value is { code: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code?: unknown }).code === "string"
  );
}
