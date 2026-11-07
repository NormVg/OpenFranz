export type IngestFolder = "arsenal" | "knowledge";

export type IngestTextInput = {
  kind: "text";
  title: string;
  content: string;
  folder: IngestFolder;
};

export type IngestUrlInput = {
  kind: "url";
  url: string;
  folder: IngestFolder;
};

export type IngestInput = IngestTextInput | IngestUrlInput;

export type IngestResult = {
  path: string;
  title: string;
  characters: number;
};
