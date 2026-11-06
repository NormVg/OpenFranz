const OLLAMA_WEB_BASE_URL = "https://ollama.com";

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
};

export type WebSearchResponse = {
  results: WebSearchResult[];
};

export type WebFetchResponse = {
  title: string;
  content: string;
  links: string[];
};

type RawWebSearchResponse = {
  results?: WebSearchResult[] | null;
};

type RawWebFetchResponse = {
  title?: string | null;
  content?: string | null;
  links?: string[] | null;
};

function requireApiKey(): string {
  const apiKey = process.env.OLLAMA_API_KEY;

  if (!apiKey) {
    throw new Error("OLLAMA_API_KEY is not configured.");
  }

  return apiKey;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${OLLAMA_WEB_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 300);
    throw new Error(
      `Ollama web API returned ${response.status}${detail ? `: ${detail}` : ""}.`,
    );
  }

  return (await response.json()) as T;
}

export async function webSearch(
  query: string,
  maxResults: number,
): Promise<WebSearchResponse> {
  const response = await postJson<RawWebSearchResponse>("/api/web_search", {
    query,
    max_results: maxResults,
  });

  return { results: response.results ?? [] };
}

export async function webFetch(url: string): Promise<WebFetchResponse> {
  const response = await postJson<RawWebFetchResponse>("/api/web_fetch", {
    url,
  });

  return {
    title: response.title ?? "",
    content: response.content ?? "",
    links: response.links ?? [],
  };
}
