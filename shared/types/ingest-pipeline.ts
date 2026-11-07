export type IngestJobStatus = "queued" | "processing" | "completed" | "failed";

export type IngestPipelineDocument = {
  path: string;
  title: string;
  action: "created" | "updated";
};

export type IngestPipelineResult = {
  summary: string;
  documents: IngestPipelineDocument[];
  skipped: boolean;
  mediaType: "reel" | "post";
  transcriptCharacters: number;
  framesAnalyzed: number;
};

export type IngestJobRecord = {
  id: string;
  kind: "instagram";
  sourceUrl: string;
  status: IngestJobStatus;
  result: IngestPipelineResult | null;
  error: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type PreparedMediaContext = {
  sourceUrl: string;
  mediaType: "reel" | "post";
  transcript: string;
  segments: TranscriptSegment[];
  visualAnalysis: string;
  frameCount: number;
};
