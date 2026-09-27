import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema> & { $client: Pool };

// Reuse one pool per process (and across dev hot reloads).
const globalForDb = globalThis as unknown as { catradersDb?: Database };

export function getDb(): Database {
  if (!globalForDb.catradersDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForDb.catradersDb = drizzle(new Pool({ connectionString, max: 10 }), { schema });
  }
  return globalForDb.catradersDb;
}
