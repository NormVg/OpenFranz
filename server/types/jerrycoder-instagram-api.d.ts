declare module "@jerrycoder/instagram-api" {
  export type JerryCoderInstagramPayload = {
    type?: "video" | "image";
    url?: string;
    thumbnail?: string | null;
    total_media?: number;
    [key: string]: unknown;
  };

  export function instagram(
    url: string,
    options?: { api?: string; timeout?: number },
  ): Promise<JerryCoderInstagramPayload>;
}
