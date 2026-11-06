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
  session?: ClientSessionState;
  events?: SessionStreamEvent[];
}
