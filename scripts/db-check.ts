import { sql } from "drizzle-orm";
import { getDatabase } from "../server/db/client.ts";

const result = await getDatabase().execute(sql`select 1 as ok`);
console.log("Database connection succeeded.", result);
