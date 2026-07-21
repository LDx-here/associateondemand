import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required. Run: docker compose up -d");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  const sqlPath = path.join(__dirname, "../drizzle/0001_colossal_ghost_rider.sql");
  const raw = await fs.readFile(sqlPath, "utf-8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  // users table not in 0001 migration — create if missing
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(64) NOT NULL,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
      )
    `);
    console.log("✓ users");
  } catch {
    console.log("· users exists");
  }

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      const tableMatch = stmt.match(/CREATE TABLE `(\w+)`/);
      if (tableMatch) console.log(`✓ ${tableMatch[1]}`);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "ER_TABLE_EXISTS_ERROR") {
        console.log(`· table exists (skip)`);
      } else {
        throw err;
      }
    }
  }

  await conn.end();
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
