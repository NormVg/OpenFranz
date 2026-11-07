export const transcribeService = {
  async transcribe(
    audio: ArrayBuffer,
    durationSeconds: number,
  ): Promise<string> {
    const response = await $fetch<{ text: string }>("/api/transcribe", {
      method: "POST",
      body: audio,
      headers: {
        "content-type": "audio/wav",
        "x-audio-duration": String(durationSeconds),
      },
    });

    return response.text;
  },
};
