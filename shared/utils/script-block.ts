/**
 * The script fence is the display contract between the agent and the chat.
 * The agent writes a script deliverable inside a fenced block with the
 * `script` info string, and the chat renders it as a designed card instead
 * of generic markdown.
 *
 * ````
 * ```script title="Cold brew launch reel" brand="Acme Coffee"
 * ### Variant A - contrast open
 * 0-2s | on-screen: ... | spoken: ... | visual: ...
 * ```
 * ````
 *
 * While the agent streams, the closing fence may not exist yet. The parser
 * marks such a segment `closed: false` so the card can render it live
 * instead of dumping raw fence syntax into the chat.
 */

export type ScriptSegment =
  | { type: "text"; text: string }
  | {
      type: "script";
      title: string | null;
      brand: string | null;
      content: string;
      closed: boolean;
    };

const SCRIPT_FENCE_OPEN = /^ {0,3}```script[ \t]*(.*)$/;
const FENCE_CLOSE = /^ {0,3}```[ \t]*$/;
const ATTRIBUTE_PATTERN = /([a-zA-Z-]+)="([^"\n]*)"/g;

function parseAttributes(rest: string): {
  title: string | null;
  brand: string | null;
} {
  const attrs = new Map<string, string>();

  for (const match of rest.matchAll(ATTRIBUTE_PATTERN)) {
    const [, key, value] = match;
    if (key) attrs.set(key.toLowerCase(), value ?? "");
  }

  const read = (key: string): string | null => {
    const value = attrs.get(key)?.trim();
    return value ? value.slice(0, 200) : null;
  };

  return { title: read("title"), brand: read("brand") };
}

export function parseScriptSegments(text: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  let cursor = 0;
  let lineStart = 0;

  const pushText = (chunk: string) => {
    const text = chunk.replace(/\n+$/, "");
    if (text.trim().length > 0) segments.push({ type: "text", text });
  };

  while (lineStart <= text.length) {
    const lineEnd = text.indexOf("\n", lineStart);
    const line = text.slice(
      lineStart,
      lineEnd === -1 ? text.length : lineEnd,
    );
    const open = line.match(SCRIPT_FENCE_OPEN);

    if (open) {
      pushText(text.slice(cursor, lineStart));

      const { title, brand } = parseAttributes(open[1] ?? "");

      // Scan for the closing fence, or consume the rest while streaming.
      let closeLineStart = -1;
      let scan = lineEnd === -1 ? text.length + 1 : lineEnd + 1;

      while (scan <= text.length) {
        const scanEnd = text.indexOf("\n", scan);
        const scanLine = text.slice(scan, scanEnd === -1 ? text.length : scanEnd);

        if (FENCE_CLOSE.test(scanLine)) {
          closeLineStart = scan;
          break;
        }

        if (scanEnd === -1) break;
        scan = scanEnd + 1;
      }

      const contentStart = lineEnd === -1 ? text.length : lineEnd + 1;
      let content: string;
      let closed: boolean;

      if (closeLineStart === -1) {
        content = text.slice(contentStart);
        closed = false;
        lineStart = text.length + 1;
        cursor = text.length;
      } else {
        content = text.slice(contentStart, closeLineStart);
        closed = true;
        const closeEnd = text.indexOf("\n", closeLineStart);
        lineStart = cursor =
          closeEnd === -1 ? text.length : closeEnd + 1;
      }

      segments.push({
        type: "script",
        title,
        brand,
        content: content.replace(/^\n+/, "").replace(/\n+$/, ""),
        closed,
      });

      continue;
    }

    if (lineEnd === -1) break;
    lineStart = lineEnd + 1;
  }

  pushText(text.slice(cursor));
  return segments;
}

/**
 * A beat is one timing line inside a script:
 *
 *   0-2s | on-screen: Cold brew pour | spoken: "Wait for it" | visual: macro steam
 *
 * The card renders beats as a structured grid with a time rail, which is
 * the readable form of a script. Anything that is not a beat or a heading
 * stays markdown and renders through the normal renderer.
 */

export type ScriptBeatSegment = {
  label: string | null;
  value: string;
};

export type ScriptContentBlock =
  | { type: "heading"; level: number; text: string }
  | {
      type: "beats";
      beats: Array<{ time: string; segments: ScriptBeatSegment[] }>;
    }
  | { type: "markdown"; text: string };

// Models drift between separators and dash glyphs. The separator after the
// timing is usually a pipe but sometimes a colon ("0-2s: on-screen: ..."), and
// the range dash arrives as ASCII, U+2011 non-breaking, or an en/em dash
// ("0‑2s"). All of these open a beat; labels inside a segment always use a
// colon. The matched time and label are normalized back to ASCII hyphens for
// display.
const DASH_CLASS = "\\u2010-\\u2014-";
const NORMALIZE_DASHES = /[-\u2010-\u2014]/g;
const BEAT_LINE = new RegExp(
  `^[ \\t]*(\\d+(?:\\.\\d+)?(?:[ \\t]*[${DASH_CLASS}][ \\t]*\\d+(?:\\.\\d+)?)?)[ \\t]*s?[ \\t]*(?:\\||:)[ \\t]*(.*)$`,
);
const HEADING_LINE = /^[ \t]{0,3}(#{1,6})[ \t]+(.+)$/;
const SEGMENT_SPLIT = /[ \t]*\|[ \t]*/;
// Beats sometimes chain labeled segments with a sentence period instead of a
// pipe ("on-screen: ... . spoken: ..."). A sentence end followed by a
// lowercase hyphenated label and a colon is that drift, not prose — split
// there too. Capitalized words are left alone: after a period those are
// overwhelmingly new sentences.
const CHAINED_LABEL_SPLIT =
  /(?<=[.\u2026?!])[ \t]+(?=[a-z][a-z\u2010-\u2014-]{1,15}:)/;
const LABELED_SEGMENT = new RegExp(
  `^([A-Za-z][A-Za-z ${DASH_CLASS}]*?)[ \\t]*:[ \\t]*(.*)$`,
);

function parseBeatLine(line: string) {
  const match = line.match(BEAT_LINE);
  if (!match) return null;

  const time = `${(match[1] ?? "").replace(NORMALIZE_DASHES, "-").trim()}s`;
  const segments: ScriptBeatSegment[] = [];

  for (const pipePart of (match[2] ?? "").split(SEGMENT_SPLIT)) {
    for (const part of pipePart.split(CHAINED_LABEL_SPLIT)) {
      if (part.trim().length === 0) continue;

      const labeled = part.match(LABELED_SEGMENT);
      if (labeled) {
        segments.push({
          label:
            (labeled[1] ?? "")
              .replace(NORMALIZE_DASHES, "-")
              .trim()
              .toLowerCase() || null,
          value: labeled[2] ?? "",
        });
      } else {
        segments.push({ label: null, value: part });
      }
    }
  }

  return { time, segments };
}

export function parseScriptContent(content: string): ScriptContentBlock[] {
  const blocks: ScriptContentBlock[] = [];
  const markdownLines: string[] = [];
  let beats: Array<{ time: string; segments: ScriptBeatSegment[] }> = [];

  const flushMarkdown = () => {
    if (markdownLines.length === 0) return;
    const text = markdownLines
      .join("\n")
      .replace(/^\n+/, "")
      .replace(/\n+$/, "");
    markdownLines.length = 0;
    if (text.length === 0) return;
    blocks.push({ type: "markdown", text });
  };

  const flushBeats = () => {
    if (beats.length === 0) return;
    blocks.push({ type: "beats", beats });
    beats = [];
  };

  for (const line of content.split("\n")) {
    const beat = parseBeatLine(line);

    if (beat) {
      flushMarkdown();
      beats.push(beat);
      continue;
    }

    flushBeats();

    const heading = line.match(HEADING_LINE);
    if (heading) {
      flushMarkdown();
      blocks.push({
        type: "heading",
        level: heading[1]?.length ?? 3,
        text: heading[2]?.trim() ?? "",
      });
      continue;
    }

    markdownLines.push(line);
  }

  flushMarkdown();
  flushBeats();

  return blocks;
}
