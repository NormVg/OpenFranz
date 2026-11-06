export type ToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function toolSuccess<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

export function toolFailure(error: unknown): ToolResult<never> {
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : "The tool call failed.";

  return { ok: false, error: message };
}

export async function runTool<T>(
  action: () => Promise<T>,
): Promise<ToolResult<T>> {
  try {
    return toolSuccess(await action());
  } catch (error) {
    return toolFailure(error);
  }
}
