import { normalizeVfsPath, violatesRootPolicy } from "./vfs-path";
import type { TranscriptSegment } from "../types/ingest-pipeline";

export function selectFrameTimes(
  segments: TranscriptSegment[],
  durationSeconds: number,
  maxFrames = 12,
): number[] {
  const duration = Math.max(durationSeconds, 0);
  const times = segments
    .map((segment) => (segment.start + segment.end) / 2)
    .filter((time) => Number.isFinite(time) && time >= 0 && time <= duration)
    .sort((left, right) => left - right);

  if (times.length === 0) {
    const fallbackCount = Math.min(Math.max(maxFrames, 1), 8);
    return Array.from({ length: fallbackCount }, (_, index) =>
      Number(((index + 1) * duration / (fallbackCount + 1)).toFixed(2)),
    );
  }

  const count = Math.min(Math.max(maxFrames, 1), times.length);
  const step = times.length / count;
  const selected = Array.from({ length: count }, (_, index) =>
    times[Math.min(Math.floor(index * step), times.length - 1)],
  );

  return selected.map((time) =>
    Number(Math.min(time ?? 0, Math.max(duration - 0.05, 0)).toFixed(2)),
  );
}

export function isSafeIngestPath(path: string): boolean {
  try {
    const normalized = normalizeVfsPath(path);
    if (!normalized.endsWith(".md")) return false;
    if (violatesRootPolicy(normalized, "file")) return false;
    return normalized.startsWith("/arsenal/") || normalized.startsWith("/knowledge/");
  } catch {
    return false;
  }
}
