const DEFAULT_WAKE_TIMEOUT_MS = 60_000;

/**
 * Calls the Render worker's wake endpoint. A sleeping free instance can take
 * close to a minute to boot, so the caller chooses how long to wait.
 */
export async function wakeIngestWorker(
  timeoutMs = DEFAULT_WAKE_TIMEOUT_MS,
): Promise<boolean> {
  const baseUrl = process.env.INGEST_WORKER_URL;
  if (!baseUrl) return false;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/wake`, {
      method: "POST",
      headers: {
        "x-worker-secret": process.env.INGEST_WORKER_SECRET ?? "",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    return response.ok;
  } catch {
    return false;
  }
}
