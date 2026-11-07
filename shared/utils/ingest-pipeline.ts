import { normalizeVfsPath, violatesRootPolicy } from "./vfs-path";
import type { TranscriptSegment } from "../types/ingest-pipeline";

const MIN_FRAMES = 6;
const SECONDS_PER_FRAME = 2;
const MIN_FRAME_GAP_SECONDS = 0.5;

/**
 * How many frames a reel of this length deserves: roughly one every two
 * seconds, never fewer than six, never more than the caller's cap.
 */
export function frameTarget(durationSeconds: number, maxFrames: number): number {
  const limit = Math.max(Math.floor(maxFrames), 1);
  const duration = Math.max(durationSeconds, 0);
  const desired = Math.ceil(duration / SECONDS_PER_FRAME);

  return Math.min(Math.max(desired, Math.min(MIN_FRAMES, limit)), limit);
}

function closestTo(times: number[], centre: number): number | null {
  if (times.length === 0) return null;

  return times.reduce((best, time) =>
    Math.abs(time - centre) < Math.abs(best - centre) ? time : best,
  );
}

/**
 * Splits the reel into equal slots and gives each slot one frame. A visual
 * scene cut wins the slot, then a speech segment midpoint, then the slot
 * centre. That keeps coverage even while anchoring frames to real beats.
 */
export function selectFrameTimes(
  segments: TranscriptSegment[],
  durationSeconds: number,
  maxFrames = 24,
  sceneTimes: number[] = [],
): number[] {
  const duration = Math.max(durationSeconds, 0);
  if (duration <= 0) return [];

  const target = frameTarget(duration, maxFrames);
  const slotSize = duration / target;
  const clamp = (time: number) =>
    Math.min(Math.max(time, 0), Math.max(duration - 0.05, 0));
  const isInside = (time: number) =>
    Number.isFinite(time) && time >= 0 && time <= duration;

  const speech = segments
    .map((segment) => (segment.start + segment.end) / 2)
    .filter(isInside)
    .sort((left, right) => left - right);

  const scenes = sceneTimes
    .filter(isInside)
    .sort((left, right) => left - right);

  const selected: number[] = [];

  for (let index = 0; index < target; index += 1) {
    const start = index * slotSize;
    const end = start + slotSize;
    const centre = (start + end) / 2;
    const inSlot = (time: number) => time >= start && time < end;

    const scenePick = closestTo(scenes.filter(inSlot), centre);
    const speechPick = closestTo(speech.filter(inSlot), centre);
    const pick = scenePick ?? speechPick ?? centre;

    selected.push(Number(clamp(pick).toFixed(2)));
  }

  const unique: number[] = [];
  for (const time of selected) {
    if (
      unique.every(
        (existing) => Math.abs(existing - time) >= MIN_FRAME_GAP_SECONDS,
      )
    ) {
      unique.push(time);
    }
  }

  return unique;
}

const MIN_DOCUMENT_CHARS = 300;
const MAX_DOCUMENT_CHARS = 6_000;

/**
 * The hard floor for an ingested document. The prompt sets the quality bar;
 * this keeps a weak run from writing a thin, unsourced, or placeholder file.
 */
export function validateIngestDocument(
  content: string,
  sourceUrl: string,
): string[] {
  const problems: string[] = [];
  const trimmed = content.trim();

  if (trimmed.length < MIN_DOCUMENT_CHARS) {
    problems.push(
      "The document is too thin. Include concrete evidence from the source and a specific application.",
    );
  }
  if (trimmed.length > MAX_DOCUMENT_CHARS) {
    problems.push(
      "The document is too long. Keep it under 6000 characters and one idea per document.",
    );
  }
  if (!trimmed.startsWith("# ")) {
    problems.push("The document must start with a level-1 Markdown heading.");
  }
  if (!trimmed.includes(sourceUrl)) {
    problems.push(`The document must include the source URL: ${sourceUrl}`);
  }
  if (!/^##\s+/m.test(trimmed)) {
    problems.push("The document must include at least one level-2 section.");
  }
  if (/\b(to be created|TBD|TODO|lorem ipsum)\b/i.test(trimmed)) {
    problems.push("Remove placeholder text before writing.");
  }

  return problems;
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

const WAV_HEADER_BYTES = 44;
const WAV_BYTES_PER_SECOND = 32_000;

/**
 * Rendi writes 16 kHz mono 16-bit PCM, so the byte length is an exact duration
 * source. This avoids a separate FFprobe call, which some plans do not allow.
 */
export function wavDurationSeconds(buffer: ArrayBuffer): number {
  const bytes = Math.max(buffer.byteLength - WAV_HEADER_BYTES, 0);
  return bytes / WAV_BYTES_PER_SECOND;
}
