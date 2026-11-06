import { defineAgent, defineDynamic } from "eve";
import { createOllama } from "ai-sdk-ollama";

const ollama = createOllama({
  apiKey: process.env.OLLAMA_API_KEY,
  baseURL: process.env.OLLAMA_BASE_URL,
});

const DEFAULT_OLLAMA_MODEL = "gpt-oss:120b-cloud";
const IMAGE_OLLAMA_MODEL = "gemma4:31b-cloud";
const CONTEXT_WINDOW_TOKENS = 128_000;

export default defineAgent({
  defaultTools: false,
  model: defineDynamic((ctx) => {
    const preferred = ctx.session.auth.initiator?.attributes?.preferredModel;
    const hasImage = ctx.turn?.input.some(
      (part) => part.kind === "file" && part.mediaType.startsWith("image/"),
    );
    const modelId = hasImage
      ? IMAGE_OLLAMA_MODEL
      : typeof preferred === "string" && preferred.length > 0
        ? preferred
        : DEFAULT_OLLAMA_MODEL;

    const wantsReasoning = JSON.stringify({
      session: ctx.session,
      channel: ctx.channel,
      conversation: ctx.conversation,
      view: ctx.view,
      turn: ctx.turn,
      now: ctx.now,
    }).includes("reasoningEnabled");

    const auth = ctx.session.auth.current;
    console.log(
      "turn context:",
      JSON.stringify({
        modelId,
        hasImage,
        principalId: auth?.principalId,
        principalType: auth?.principalType,
        wantsReasoning,
      }),
    );

    return {
      model: ollama(modelId, { think: wantsReasoning }),
      modelContextWindowTokens: CONTEXT_WINDOW_TOKENS,
    };
  }),
  build: {
    externalDependencies: ["ai-sdk-ollama"],
  },
});
