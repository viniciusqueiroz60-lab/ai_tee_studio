import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool;
let db: NodePgDatabase<typeof schema>;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Database features will be unavailable.");
  pool = new Pool(); // Dummy pool
  db = drizzle(pool, { schema });
} else {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
}

export { pool, db };

export * from "./schema";
