import { eq, or, sql } from "drizzle-orm";
import { getDatabase } from "../db/client";
import {
  vfsLinks,
  type NewVfsLink,
  type VfsLink,
} from "../db/schema/vfs";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function replaceLinksForSource(
  sourcePath: string,
  links: Array<Pick<NewVfsLink, "targetPath" | "kind">>,
): Promise<void> {
  const database = getDatabase();
  await database.delete(vfsLinks).where(eq(vfsLinks.sourcePath, sourcePath));

  if (links.length === 0) return;

  await database
    .insert(vfsLinks)
    .values(links.map((link) => ({ sourcePath, ...link })))
    .onConflictDoNothing();
}

export async function listLinksFrom(sourcePath: string): Promise<VfsLink[]> {
  return getDatabase()
    .select()
    .from(vfsLinks)
    .where(eq(vfsLinks.sourcePath, sourcePath));
}

export async function listLinksTo(targetPath: string): Promise<VfsLink[]> {
  return getDatabase()
    .select()
    .from(vfsLinks)
    .where(eq(vfsLinks.targetPath, targetPath));
}

export async function listAllLinks(): Promise<VfsLink[]> {
  return getDatabase().select().from(vfsLinks);
}

export async function retargetLinks(from: string, to: string): Promise<void> {
  await getDatabase()
    .update(vfsLinks)
    .set({
      targetPath: sql`${to} || substring(${vfsLinks.targetPath} from ${from.length + 1})`,
    })
    .where(
      or(
        eq(vfsLinks.targetPath, from),
        sql`${vfsLinks.targetPath} like ${`${escapeLike(from)}/%`} escape '\\'`,
      ),
    );
}
