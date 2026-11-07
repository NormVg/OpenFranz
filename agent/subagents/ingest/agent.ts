import { defineAgent, defineDynamic } from "eve";
import { createOllama } from "ai-sdk-ollama";

const ollama = createOllama({
  apiKey: process.env.OLLAMA_API_KEY,
  baseURL: process.env.OLLAMA_BASE_URL,
});

export default defineAgent({
  description:
    "Ingests public Instagram reels and posts into the shared knowledge library.",
  defaultTools: false,
  model: defineDynamic(() => ({
    model: ollama("gpt-oss:120b-cloud"),
    modelContextWindowTokens: 128_000,
  })),
});
