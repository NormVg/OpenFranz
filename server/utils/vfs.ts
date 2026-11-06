import { createError, type H3Event } from "h3";
import { VfsServiceError, vfs } from "../services/vfs.service";

export { vfs };

export function defineVfsHandler<T>(
  handler: (event: H3Event) => Promise<T> | T,
) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event);
    } catch (error) {
      if (error instanceof VfsServiceError) {
        throw createError({
          statusCode: error.statusCode,
          statusMessage: error.message,
        });
      }

      throw error;
    }
  });
}
