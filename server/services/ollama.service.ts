export type OllamaToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<Record<string, unknown>> | null;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
  name?: string;
};

type OllamaToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type OllamaChatOptions = {
  model: string;
  messages: OllamaMessage[];
  tools?: OllamaToolDefinition[];
};

function baseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? "https://ollama.com").replace(/\/$/, "");
}

function apiKey(): string {
  const key = process.env.OLLAMA_API_KEY;
  if (!key) throw new Error("OLLAMA_API_KEY is not configured.");
  return key;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Ollama request failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

export async function ollamaChat(options: OllamaChatOptions): Promise<{
  content: string;
  toolCalls: OllamaToolCall[];
}> {
  const payload = await post<{
    choices?: Array<{
      message?: {
        content?: string | null;
        tool_calls?: OllamaToolCall[];
      };
    }>;
  }>("/v1/chat/completions", {
    model: options.model,
    messages: options.messages,
    stream: false,
    tools: options.tools,
    tool_choice: options.tools ? "auto" : undefined,
  });

  const message = payload.choices?.[0]?.message;
  return {
    content: message?.content ?? "",
    toolCalls: message?.tool_calls ?? [],
  };
}

export async function ollamaVision(options: {
  text: string;
  images: string[];
  model?: string;
}): Promise<string> {
  const content: Array<Record<string, unknown>> = [
    { type: "text", text: options.text },
    ...options.images.map((url) => ({
      type: "image_url",
      image_url: { url },
    })),
  ];

  const result = await ollamaChat({
    model: options.model ?? "gemma4:31b-cloud",
    messages: [{ role: "user", content }],
  });

  return result.content;
}
