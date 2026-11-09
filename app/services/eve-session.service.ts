import {
  classifySessionProbe,
  type SessionProbeVerdict,
} from "~~/shared/utils/session-recovery";

const STREAM_PROBE_TIMEOUT_MS = 8_000;

interface SessionProbeSnapshot {
  /** HTTP status of the stream probe, or null when the request never answered. */
  readonly status: number | null;
  /** Response body, read only where the status alone cannot decide the verdict. */
  readonly body: string | null;
}

async function probeSessionStream(
  sessionId: string,
): Promise<SessionProbeSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STREAM_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `/eve/v1/session/${encodeURIComponent(sessionId)}/stream`,
      {
        headers: { accept: "text/event-stream" },
        signal: controller.signal,
      },
    );

    // A live session answers 200 and holds the stream open; the verdict needs
    // at most the status plus an error body, so the stream is never consumed.
    const body = response.status === 409 ? await response.text() : null;
    controller.abort();

    return { status: response.status, body };
  } catch {
    return { status: null, body: null };
  } finally {
    clearTimeout(timeout);
  }
}

export const eveSessionService = {
  /**
   * Probes whether a persisted eve session can still be resumed, without
   * waiting through the eve client's reconnect retries. A definitive 404
   * answers immediately; anything else defers to the normal resume path.
   */
  async probe(sessionId: string): Promise<SessionProbeVerdict> {
    const snapshot = await probeSessionStream(sessionId);
    return classifySessionProbe(snapshot.status, snapshot.body);
  },
};
