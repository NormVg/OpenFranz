import type { ClientSessionState, SessionStreamEvent } from "eve/client";

export interface ChatRecord {
  id: string;
  title: string;
  updatedAt: string;
  session?: ClientSessionState;
  events: SessionStreamEvent[];
}

export interface ChatPatch {
  title?: string;
  /** `null` clears the persisted session so the chat opens fresh. */
  session?: ClientSessionState | null;
  events?: SessionStreamEvent[];
}
