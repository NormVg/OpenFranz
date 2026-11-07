import { defineAgent } from "eve";
import { createOllama } from "ai-sdk-ollama";

const ollama = createOllama({
  apiKey: process.env.OLLAMA_API_KEY,
  baseURL: process.env.OLLAMA_BASE_URL,
});

export default defineAgent({
  defaultTools: false,
  model: ollama("gpt-oss:120b-cloud"),
});
