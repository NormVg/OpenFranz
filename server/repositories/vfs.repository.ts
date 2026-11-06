import { asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDatabase } from "../db/client";
import {
  vfsNodes,
  type NewVfsNode,
  type VfsNode,
} from "../db/schema/vfs";

export async function findByPath(path: string): Promise<VfsNode | null> {
  const [row] = await getDatabase()
    .select()
    .from(vfsNodes)
    .where(eq(vfsNodes.path, path))
    .limit(1);

  return row ?? null;
}

export async function listChildren(parentPath: string): Promise<VfsNode[]> {
  return getDatabase()
    .select()
    .from(vfsNodes)
    .where(eq(vfsNodes.parentPath, parentPath))
    .orderBy(asc(vfsNodes.type), asc(vfsNodes.name));
}

export async function countChildren(parentPath: string): Promise<number> {
  const [row] = await getDatabase()
    .select({ count: sql<number>`count(*)::int` })
    .from(vfsNodes)
    .where(eq(vfsNodes.parentPath, parentPath));

  return row?.count ?? 0;
}

export async function insertNode(values: NewVfsNode): Promise<VfsNode> {
  const [row] = await getDatabase()
    .insert(vfsNodes)
    .values(values)
    .returning();

  if (!row) throw new Error("The filesystem node could not be created.");
  return row;
}

export async function updateNode(
  path: string,
  values: Partial<NewVfsNode>,
): Promise<VfsNode | null> {
  const [row] = await getDatabase()
    .update(vfsNodes)
    .set(values)
    .where(eq(vfsNodes.path, path))
    .returning();

  return row ?? null;
}

export async function deleteNode(path: string): Promise<boolean> {
  const [row] = await getDatabase()
    .delete(vfsNodes)
    .where(eq(vfsNodes.path, path))
    .returning({ id: vfsNodes.id });

  return Boolean(row);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function deleteSubtree(path: string): Promise<boolean> {
  const [row] = await getDatabase()
    .delete(vfsNodes)
    .where(
      or(
        eq(vfsNodes.path, path),
        sql`${vfsNodes.path} like ${`${escapeLike(path)}/%`} escape '\\'`,
      ),
    )
    .returning({ id: vfsNodes.id });

  return Boolean(row);
}

export async function moveSubtree(
  from: string,
  to: string,
): Promise<VfsNode | null> {
  const database = getDatabase();

  await database
    .update(vfsNodes)
    .set({
      path: sql`${to} || substring(${vfsNodes.path} from ${from.length + 1})`,
      parentPath: sql`${to} || substring(${vfsNodes.parentPath} from ${from.length + 1})`,
      updatedAt: new Date(),
    })
    .where(sql`${vfsNodes.path} like ${`${escapeLike(from)}/%`} escape '\\'`);

  const [row] = await database
    .update(vfsNodes)
    .set({
      path: to,
      parentPath: to.slice(0, to.lastIndexOf("/")) || "/",
      name: to.slice(to.lastIndexOf("/") + 1),
      updatedAt: new Date(),
    })
    .where(eq(vfsNodes.path, from))
    .returning();

  return row ?? null;
}

export async function searchNodes(
  query: string,
  limit: number,
): Promise<VfsNode[]> {
  return getDatabase()
    .select()
    .from(vfsNodes)
    .where(
      or(
        ilike(vfsNodes.path, `%${query}%`),
        ilike(vfsNodes.content, `%${query}%`),
      ),
    )
    .orderBy(desc(vfsNodes.updatedAt))
    .limit(limit);
}
