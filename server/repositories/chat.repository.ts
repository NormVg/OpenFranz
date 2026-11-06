import { desc, eq } from "drizzle-orm";
import type { ChatPatch, ChatRecord } from "~~/shared/types/chat";
import { getDatabase } from "../db/client";
import { chats } from "../db/schema";

type ChatRow = typeof chats.$inferSelect;

function toRecord(row: ChatRow): ChatRecord {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    session: row.session ?? undefined,
    events: row.events,
  };
}

export async function listAll(): Promise<ChatRecord[]> {
  const rows = await getDatabase()
    .select()
    .from(chats)
    .orderBy(desc(chats.updatedAt));

  return rows.map(toRecord);
}

export async function findById(id: string): Promise<ChatRecord | null> {
  const [row] = await getDatabase()
    .select()
    .from(chats)
    .where(eq(chats.id, id))
    .limit(1);

  return row ? toRecord(row) : null;
}

export async function create(
  userId: string,
  title: string,
): Promise<ChatRecord> {
  const [row] = await getDatabase()
    .insert(chats)
    .values({ userId, title, events: [] })
    .returning();

  if (!row) throw new Error("The chat could not be created.");
  return toRecord(row);
}

export async function update(
  id: string,
  patch: ChatPatch,
): Promise<ChatRecord | null> {
  const values: Partial<typeof chats.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) values.title = patch.title;
  if (patch.session !== undefined) values.session = patch.session;
  if (patch.events !== undefined) values.events = patch.events;

  const [row] = await getDatabase()
    .update(chats)
    .set(values)
    .where(eq(chats.id, id))
    .returning();

  return row ? toRecord(row) : null;
}

export async function deleteById(id: string): Promise<boolean> {
  const [row] = await getDatabase()
    .delete(chats)
    .where(eq(chats.id, id))
    .returning({ id: chats.id });

  return Boolean(row);
}
