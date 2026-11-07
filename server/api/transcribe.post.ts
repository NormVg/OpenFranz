import { transcribeAudio } from "~~/server/services/sarvam-stt.service";
import { defineServiceHandler } from "~~/server/utils/service-handler";
import { ServiceError } from "~~/server/utils/service-error";
import { requireUser } from "~~/server/utils/require-user";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export default defineServiceHandler(async (event) => {
  await requireUser(event);

  const contentType = getHeader(event, "content-type") ?? "";
  if (!contentType.startsWith("audio/")) {
    throw new ServiceError(400, "Send an audio recording.");
  }

  const body = await readRawBody(event, false);
  if (!body || body.byteLength === 0) {
    throw new ServiceError(400, "The recording is empty.");
  }
  if (body.byteLength > MAX_AUDIO_BYTES) {
    throw new ServiceError(413, "The recording is too large.");
  }

  const durationHeader = Number(getHeader(event, "x-audio-duration") ?? "0");
  const durationSeconds =
    Number.isFinite(durationHeader) && durationHeader > 0 ? durationHeader : 0;

  const audio = body.buffer.slice(
    body.byteOffset,
    body.byteOffset + body.byteLength,
  ) as ArrayBuffer;

  const result = await transcribeAudio(audio, durationSeconds);
  return { text: result.transcript };
});
