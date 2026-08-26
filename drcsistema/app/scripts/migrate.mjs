import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL não definida — pulando migração (build/local sem banco).");
  process.exit(0);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

console.log("Rodando migrações do banco...");
try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrações concluídas.");
} finally {
  await pool.end();
}
