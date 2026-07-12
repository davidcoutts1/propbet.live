// Applies every SQL file in supabase/migrations (in order) to DATABASE_URL.
// Usage: node scripts/db-push.mjs   (reads .env.local for DATABASE_URL)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\n✗ DATABASE_URL is not set in .env.local.\n" +
      "  Grab it from Supabase → Connect → Session pooler and paste it in.\n"
  );
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const f of files) {
    const sql = readFileSync(join(migrationsDir, f), "utf8");
    process.stdout.write(`→ applying ${f} … `);
    await client.query(sql);
    console.log("done");
  }
  console.log("\n✓ All migrations applied.");
} catch (err) {
  console.error("\n✗ Migration failed:\n", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
